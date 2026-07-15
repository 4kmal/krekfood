import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  errorJsonResponse,
  internalDiagnostic,
  missingConfigurationDiagnostic,
  type ApiDiagnosticPayload,
} from "../_shared/api-diagnostics.ts";
import {
  ChatGenerationError,
  generateChatDecision,
  type ChatAiMode,
  type ChatHistoryEntry,
} from "../_shared/chat-ai.ts";
import {
  enrichDatabaseMatches,
  searchRestaurants,
  type RestaurantFilters,
  type RestaurantLocation,
} from "./restaurants.ts";
import {
  AuthenticationError,
  requireAuthenticatedUser,
} from "../_shared/require-user.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type UnknownRecord = Record<string, unknown>;

interface ChatRequestBody {
  message?: unknown;
  history?: unknown;
  filters?: unknown;
  location?: unknown;
  aiMode?: unknown;
  model?: unknown;
}

function readHistory(value: unknown): ChatHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is { role: 'user' | 'assistant'; content: string } => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as { role?: unknown; content?: unknown };
      return (candidate.role === 'user' || candidate.role === 'assistant')
        && typeof candidate.content === 'string';
    })
    .slice(-12)
    .map((entry) => ({
      role: entry.role,
      content: entry.content.slice(0, 4_000),
    }));
}

function readFilters(value: unknown): RestaurantFilters {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as { budget?: unknown; cuisine?: unknown };
  return {
    budget: typeof candidate.budget === 'string' ? candidate.budget.slice(0, 100) : undefined,
    cuisine: typeof candidate.cuisine === 'string' ? candidate.cuisine.slice(0, 100) : undefined,
  };
}

function readLocation(value: unknown): RestaurantLocation | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { lat?: unknown; lon?: unknown };
  return typeof candidate.lat === 'number' && Number.isFinite(candidate.lat)
    && typeof candidate.lon === 'number' && Number.isFinite(candidate.lon)
    ? { lat: candidate.lat, lon: candidate.lon }
    : null;
}

function requestError(code: string, message: string): Response {
  return errorJsonResponse({
    provider: 'supabase',
    service: 'chat',
    code,
    category: 'configuration',
    severity: 'error',
    message,
    status: 400,
    retryable: false,
  }, corsHeaders, 400);
}

function dedupeDiagnostics(diagnostics: ApiDiagnosticPayload[]): ApiDiagnosticPayload[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.provider}:${diagnostic.service}:${diagnostic.code}:${diagnostic.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await requireAuthenticatedUser(req);
    const body = await req.json() as ChatRequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return requestError('CHAT_MESSAGE_REQUIRED', 'A chat message is required.');
    if (message.length > 2_000) {
      return requestError('CHAT_MESSAGE_TOO_LONG', 'The chat message is longer than 2,000 characters.');
    }

    const aiMode: ChatAiMode = body.aiMode === 'gemini' ? 'gemini' : 'nine_router';
    const model = typeof body.model === 'string' ? body.model.slice(0, 200) : undefined;
    const history = readHistory(body.history);
    const filters = readFilters(body.filters);
    const location = readLocation(body.location);
    const diagnostics: ApiDiagnosticPayload[] = [];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!supabaseUrl) {
      return errorJsonResponse(
        missingConfigurationDiagnostic('supabase', 'kedai-database', 'SUPABASE_URL'),
        corsHeaders,
      );
    }
    if (!supabaseKey) {
      return errorJsonResponse(
        missingConfigurationDiagnostic('supabase', 'kedai-database', 'SUPABASE_SERVICE_ROLE_KEY'),
        corsHeaders,
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: kedaiRows, error: databaseError } = await supabase
      .from('kedai_makan_demo')
      .select('*');
    const kedaiList = (Array.isArray(kedaiRows) ? kedaiRows : []) as UnknownRecord[];

    if (databaseError) {
      diagnostics.push({
        provider: 'supabase',
        service: 'kedai-database',
        code: 'SUPABASE_DATABASE_DEGRADED',
        category: 'upstream',
        severity: 'warning',
        message: 'The restaurant database could not be read; chat is continuing without local results.',
        retryable: true,
      });
    }

    const kedaiContext = kedaiList.map((kedai) => {
      const tags = Array.isArray(kedai.tags) ? kedai.tags.join(', ') : '';
      return `- ${String(kedai.name || '')} (${String(kedai.area || '')}): ${String(kedai.signature || '')}, Price: ${String(kedai.price_level || '')}, Tags: ${tags}`;
    }).join('\n') || 'No local database available';

    const generation = await generateChatDecision({
      aiMode,
      model,
      message,
      history,
      kedaiContext,
      hasUserLocation: Boolean(location),
    });
    diagnostics.push(...generation.diagnostics);

    let matchedKedai: UnknownRecord[] = [];
    const decision = generation.decision;
    if (decision.use_serpapi && decision.search_query) {
      const search = await searchRestaurants(decision.search_query, filters, location);
      matchedKedai = search.data;
      diagnostics.push(...search.diagnostics);
    } else if (decision.recommendations.length > 0) {
      const enrichment = await enrichDatabaseMatches(kedaiList, decision.recommendations, location);
      matchedKedai = enrichment.data;
      diagnostics.push(...enrichment.diagnostics);
    }

    return new Response(JSON.stringify({
      message: decision.reply,
      kedai: matchedKedai,
      aiMode,
      model: generation.model,
      diagnostics: dedupeDiagnostics(diagnostics),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorJsonResponse(error.diagnostic, corsHeaders, error.diagnostic.status);
    }
    if (error instanceof ChatGenerationError) {
      return errorJsonResponse(error.diagnostic, corsHeaders);
    }
    return errorJsonResponse(internalDiagnostic('chat'), corsHeaders);
  }
});
