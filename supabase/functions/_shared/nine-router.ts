import {
  missingConfigurationDiagnostic,
  networkDiagnostic,
  providerFailureDiagnostic,
  type ApiDiagnosticPayload,
} from "./api-diagnostics.ts";

export interface NineRouterModel {
  id: string;
  ownedBy: string;
  isCombo: boolean;
}
interface NineRouterModelsEnvelope {
  data?: Array<{
    id?: unknown;
    owned_by?: unknown;
  }>;
}

interface NineRouterChatEnvelope {
  model?: unknown;
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

export interface NineRouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NineRouterCompletion {
  text: string;
  resolvedModel?: string;
}

interface ModelsCache {
  expiresAt: number;
  models: NineRouterModel[];
}

const MODELS_CACHE_MS = 5 * 60 * 1000;
let modelsCache: ModelsCache | null = null;

export class NineRouterError extends Error {
  diagnostic: ApiDiagnosticPayload;

  constructor(diagnostic: ApiDiagnosticPayload) {
    super(diagnostic.message);
    this.name = 'NineRouterError';
    this.diagnostic = diagnostic;
  }
}

function getConfiguration() {
  const rawBaseUrl = Deno.env.get('NINE_ROUTER_BASE_URL')?.trim() || '';
  const apiKey = Deno.env.get('NINE_ROUTER_API_KEY')?.trim() || '';
  const defaultModel = Deno.env.get('NINE_ROUTER_DEFAULT_MODEL')?.trim() || 'krekfood-chat';

  if (!rawBaseUrl) {
    throw new NineRouterError(
      missingConfigurationDiagnostic('nine_router', 'configuration', 'NINE_ROUTER_BASE_URL'),
    );
  }
  if (!apiKey) {
    throw new NineRouterError(
      missingConfigurationDiagnostic('nine_router', 'configuration', 'NINE_ROUTER_API_KEY'),
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawBaseUrl);
  } catch {
    throw new NineRouterError({
      provider: 'nine_router',
      service: 'configuration',
      code: 'NINE_ROUTER_BASE_URL_INVALID',
      category: 'configuration',
      severity: 'error',
      message: 'The configured 9Router base URL is invalid.',
      retryable: false,
    });
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new NineRouterError({
      provider: 'nine_router',
      service: 'configuration',
      code: 'NINE_ROUTER_HTTPS_REQUIRED',
      category: 'configuration',
      severity: 'error',
      message: '9Router must be configured with an HTTPS endpoint.',
      retryable: false,
    });
  }

  return {
    baseUrl: rawBaseUrl.replace(/\/+$/, ''),
    apiKey,
    defaultModel,
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

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: 'The upstream response was not valid JSON.' } };
  }
}

function upstreamError(service: string, status: number, body: unknown): NineRouterError {
  return new NineRouterError(
    providerFailureDiagnostic('nine_router', service, status, body),
  );
}

export function getNineRouterDefaultModel(): string {
  return getConfiguration().defaultModel;
}

export async function listNineRouterModels(forceRefresh = false): Promise<NineRouterModel[]> {
  if (!forceRefresh && modelsCache && modelsCache.expiresAt > Date.now()) {
    return modelsCache.models;
  }

  const config = getConfiguration();
  let response: Response;
  try {
    response = await fetchWithTimeout(`${config.baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
      },
    }, 10_000);
  } catch {
    throw new NineRouterError(networkDiagnostic('nine_router', 'model-discovery'));
  }

  const body = await readResponseBody(response);
  if (!response.ok) {
    throw upstreamError('model-discovery', response.status, body);
  }

  const entries = (body as NineRouterModelsEnvelope).data;
  if (!Array.isArray(entries)) {
    throw new NineRouterError({
      provider: 'nine_router',
      service: 'model-discovery',
      code: 'NINE_ROUTER_MODELS_INVALID',
      category: 'unknown',
      severity: 'error',
      message: '9Router returned an invalid model catalog.',
      retryable: true,
    });
  }

  const seen = new Set<string>();
  const models = entries.flatMap((entry): NineRouterModel[] => {
    if (typeof entry.id !== 'string' || !entry.id.trim() || seen.has(entry.id)) return [];
    seen.add(entry.id);
    const ownedBy = typeof entry.owned_by === 'string' && entry.owned_by.trim()
      ? entry.owned_by.trim()
      : 'unknown';
    return [{ id: entry.id.trim(), ownedBy, isCombo: ownedBy === 'combo' }];
  }).sort((left, right) => {
    if (left.isCombo !== right.isCombo) return left.isCombo ? -1 : 1;
    return left.ownedBy.localeCompare(right.ownedBy) || left.id.localeCompare(right.id);
  });

  if (models.length === 0) {
    throw new NineRouterError({
      provider: 'nine_router',
      service: 'model-discovery',
      code: 'NINE_ROUTER_MODELS_EMPTY',
      category: 'not_found',
      severity: 'error',
      message: '9Router did not return any available chat models.',
      retryable: true,
    });
  }

  modelsCache = { models, expiresAt: Date.now() + MODELS_CACHE_MS };
  return models;
}

export async function resolveNineRouterModel(requestedModel?: string): Promise<{
  model: string;
  diagnostics: ApiDiagnosticPayload[];
}> {
  const defaultModel = getNineRouterDefaultModel();
  const requested = requestedModel?.trim() || defaultModel;
  const models = await listNineRouterModels();

  if (models.some((model) => model.id === requested)) {
    return { model: requested, diagnostics: [] };
  }

  const fallback = models.find((model) => model.id === defaultModel)
    ?? models.find((model) => model.isCombo)
    ?? models[0];

  return {
    model: fallback.id,
    diagnostics: [{
      provider: 'nine_router',
      service: 'model-selection',
      code: 'NINE_ROUTER_MODEL_FALLBACK',
      category: 'not_found',
      severity: 'warning',
      message: 'The selected 9Router model is no longer available; the configured fallback was used.',
      retryable: false,
    }],
  };
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (!part || typeof part !== 'object') return '';
    const candidate = part as { text?: unknown; content?: unknown };
    if (typeof candidate.text === 'string') return candidate.text;
    if (typeof candidate.content === 'string') return candidate.content;
    return '';
  }).join('');
}

export async function completeNineRouterChat(
  model: string,
  messages: NineRouterChatMessage[],
): Promise<NineRouterCompletion> {
  const config = getConfiguration();
  let response: Response;
  try {
    response = await fetchWithTimeout(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 2048,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'krekfood_chat_decision',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                reply: { type: 'string' },
                search_query: { type: 'string' },
                use_serpapi: { type: 'boolean' },
                recommendations: { type: 'array', items: { type: 'string' } },
                needs_location: { type: 'boolean' },
              },
              required: ['reply', 'search_query', 'use_serpapi', 'recommendations', 'needs_location'],
            },
          },
        },
      }),
    }, 45_000);
  } catch {
    throw new NineRouterError(networkDiagnostic('nine_router', 'chat-completions'));
  }

  const body = await readResponseBody(response);
  if (!response.ok) {
    throw upstreamError('chat-completions', response.status, body);
  }

  const envelope = body as NineRouterChatEnvelope;
  const text = extractTextContent(envelope.choices?.[0]?.message?.content).trim();
  if (!text) {
    throw new NineRouterError({
      provider: 'nine_router',
      service: 'chat-completions',
      code: 'NINE_ROUTER_RESPONSE_EMPTY',
      category: 'unknown',
      severity: 'error',
      message: '9Router returned an empty chat response.',
      retryable: true,
    });
  }

  return {
    text,
    resolvedModel: typeof envelope.model === 'string' ? envelope.model : undefined,
  };
}
