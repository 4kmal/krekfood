import {
  missingConfigurationDiagnostic,
  networkDiagnostic,
  providerFailureDiagnostic,
  type ApiDiagnosticPayload,
} from "./api-diagnostics.ts";
import {
  completeNineRouterChat,
  NineRouterError,
  resolveNineRouterModel,
  type NineRouterChatMessage,
} from "./nine-router.ts";

export type ChatAiMode = 'nine_router' | 'gemini';

export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatDecision {
  reply: string;
  search_query: string;
  use_serpapi: boolean;
  recommendations: string[];
  needs_location: boolean;
}

export interface ChatGenerationResult {
  decision: ChatDecision;
  diagnostics: ApiDiagnosticPayload[];
  model?: string;
}

interface GenerateChatInput {
  aiMode: ChatAiMode;
  model?: string;
  message: string;
  history: ChatHistoryEntry[];
  kedaiContext: string;
  hasUserLocation: boolean;
}

export class ChatGenerationError extends Error {
  diagnostic: ApiDiagnosticPayload;

  constructor(diagnostic: ApiDiagnosticPayload) {
    super(diagnostic.message);
    this.name = 'ChatGenerationError';
    this.diagnostic = diagnostic;
  }
}

function buildSystemPrompt(kedaiContext: string, hasUserLocation: boolean): string {
  return `You are "Makan Mana Geng", a friendly Malaysian food recommendation assistant.

Mix English and Malay naturally. Be warm, helpful, concise, and encouraging. Use casual Malaysian terms such as "boss", "geng", "lah", and "kan" naturally. Never mock the user.

Location rules:
1. If the user names an area such as Bangsar, KL, Petaling Jaya, or Damansara, search that area directly. Do not ask for GPS.
2. Ask for GPS only when the user says "near me", "nearby", "dekat sini", or "sekitar sini" without naming an area.
3. If the user names a place, never ask them to enable location.

${hasUserLocation ? 'The user has shared a GPS location.' : 'The user has not shared a GPS location.'}

Local verified restaurants:
${kedaiContext}

Return exactly one JSON object with this shape:
{
  "reply": "the friendly response shown to the user",
  "search_query": "a concise Google Maps restaurant search query, or an empty string",
  "use_serpapi": true,
  "recommendations": ["exact local restaurant names when using the local database"],
  "needs_location": false
}

Rules for the JSON fields:
- Set use_serpapi to true for current or area-based restaurant discovery outside the local database.
- Set use_serpapi to false and use exact names in recommendations for local database matches.
- Set needs_location to true only for a location-less "near me" request when GPS is unavailable.
- The reply must remain useful even when restaurant search is unavailable.
- Do not wrap the JSON in prose.`;
}

function sanitizeDecision(candidate: unknown): ChatDecision | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const value = candidate as Record<string, unknown>;
  const reply = typeof value.reply === 'string' ? value.reply.trim() : '';
  if (!reply) return null;

  return {
    reply,
    search_query: typeof value.search_query === 'string' ? value.search_query.trim() : '',
    use_serpapi: value.use_serpapi === true,
    recommendations: Array.isArray(value.recommendations)
      ? value.recommendations.filter((item): item is string => typeof item === 'string').slice(0, 10)
      : [],
    needs_location: value.needs_location === true,
  };
}

function malformedDiagnostic(provider: 'gemini' | 'nine_router'): ApiDiagnosticPayload {
  const label = provider === 'nine_router' ? '9Router' : 'Gemini';
  return {
    provider,
    service: 'chat-generation',
    code: `${provider.toUpperCase()}_RESPONSE_MALFORMED`,
    category: 'unknown',
    severity: 'warning',
    message: `${label} ignored the structured response format; the text response was kept.`,
    retryable: true,
  };
}

function parseDecision(text: string, provider: 'gemini' | 'nine_router'): {
  decision: ChatDecision;
  diagnostics: ApiDiagnosticPayload[];
} {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidates = [fenced?.[1], trimmed].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const parsed = sanitizeDecision(JSON.parse(candidate));
      if (parsed) return { decision: parsed, diagnostics: [] };
    } catch {
      // Try the next representation before degrading to text-only chat.
    }
  }

  const withoutFence = trimmed.replace(/```(?:json)?[\s\S]*?```/gi, '').trim();
  return {
    decision: {
      reply: withoutFence || trimmed || 'Maaf geng, AI tak dapat beri jawapan sekarang. Cuba lagi ya!',
      search_query: '',
      use_serpapi: false,
      recommendations: [],
      needs_location: false,
    },
    diagnostics: [malformedDiagnostic(provider)],
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithGemini(input: GenerateChatInput): Promise<ChatGenerationResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
  if (!apiKey) {
    throw new ChatGenerationError(
      missingConfigurationDiagnostic('gemini', 'chat-generation', 'GEMINI_API_KEY'),
    );
  }

  const systemPrompt = buildSystemPrompt(input.kedaiContext, input.hasUserLocation);
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: '{"reply":"Baik geng, nak makan apa hari ini?","search_query":"","use_serpapi":false,"recommendations":[],"needs_location":false}' }] },
    ...input.history.map((entry) => ({
      role: entry.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: entry.content }],
    })),
    { role: 'user', parts: [{ text: input.message }] },
  ];

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
      },
      45_000,
    );
  } catch {
    throw new ChatGenerationError(networkDiagnostic('gemini', 'chat-generation'));
  }

  const responseText = await response.text();
  let body: unknown = {};
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = {};
    }
  }

  if (!response.ok) {
    throw new ChatGenerationError(
      providerFailureDiagnostic('gemini', 'chat-generation', response.status, body),
    );
  }

  const envelope = body as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  };
  const text = envelope.candidates?.[0]?.content?.parts
    ?.map((part) => typeof part.text === 'string' ? part.text : '')
    .join('')
    .trim() || '';

  if (!text) {
    throw new ChatGenerationError({
      provider: 'gemini',
      service: 'chat-generation',
      code: 'GEMINI_RESPONSE_EMPTY',
      category: 'unknown',
      severity: 'error',
      message: 'Gemini returned an empty chat response.',
      retryable: true,
    });
  }

  const parsed = parseDecision(text, 'gemini');
  return { ...parsed, model: 'gemini-2.0-flash' };
}

async function generateWithNineRouter(input: GenerateChatInput): Promise<ChatGenerationResult> {
  const resolved = await resolveNineRouterModel(input.model);
  const messages: NineRouterChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(input.kedaiContext, input.hasUserLocation) },
    ...input.history,
    { role: 'user', content: input.message },
  ];
  const completion = await completeNineRouterChat(resolved.model, messages);
  const parsed = parseDecision(completion.text, 'nine_router');
  return {
    ...parsed,
    diagnostics: [...resolved.diagnostics, ...parsed.diagnostics],
    model: completion.resolvedModel || resolved.model,
  };
}

export async function generateChatDecision(input: GenerateChatInput): Promise<ChatGenerationResult> {
  try {
    return input.aiMode === 'gemini'
      ? await generateWithGemini(input)
      : await generateWithNineRouter(input);
  } catch (error) {
    if (error instanceof NineRouterError) {
      throw new ChatGenerationError(error.diagnostic);
    }
    throw error;
  }
}
