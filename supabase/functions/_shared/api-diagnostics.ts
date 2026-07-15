export type ApiProvider = 'gemini' | 'nine_router' | 'serpapi' | 'google_maps' | 'supabase' | 'groq';

export type ApiDiagnosticCategory =
  | 'configuration'
  | 'credentials'
  | 'permission'
  | 'quota'
  | 'not_found'
  | 'network'
  | 'upstream'
  | 'unknown';

export interface ApiDiagnosticPayload {
  provider: ApiProvider;
  service: string;
  code: string;
  category: ApiDiagnosticCategory;
  severity: 'warning' | 'error';
  message: string;
  status?: number;
  retryable: boolean;
}

const PROVIDER_LABELS: Record<ApiProvider, string> = {
  gemini: 'Gemini',
  nine_router: '9Router',
  serpapi: 'SerpAPI',
  google_maps: 'Google Maps',
  supabase: 'Supabase',
  groq: 'Groq',
};

function stringifyProviderBody(body: unknown): string {
  if (typeof body === 'string') return body.toLowerCase();
  try {
    return JSON.stringify(body).toLowerCase();
  } catch {
    return '';
  }
}

function providerStatus(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const candidate = body as { error?: { status?: unknown }; status?: unknown };
  const status = candidate.error?.status ?? candidate.status;
  return typeof status === 'string' ? status.toLowerCase() : '';
}

export function missingConfigurationDiagnostic(
  provider: ApiProvider,
  service: string,
  environmentName: string,
  severity: 'warning' | 'error' = 'error',
): ApiDiagnosticPayload {
  return {
    provider,
    service,
    code: `${provider.toUpperCase()}_CONFIGURATION_MISSING`,
    category: 'configuration',
    severity,
    message: `${PROVIDER_LABELS[provider]} configuration is missing (${environmentName}).`,
    retryable: false,
  };
}

export function providerFailureDiagnostic(
  provider: ApiProvider,
  service: string,
  status: number | undefined,
  body: unknown,
  severity: 'warning' | 'error' = 'error',
): ApiDiagnosticPayload {
  const normalized = stringifyProviderBody(body);
  const apiStatus = providerStatus(body);
  let category: ApiDiagnosticCategory = 'unknown';
  let suffix = 'ERROR';
  let retryable = false;

  if (
    status === 429 ||
    apiStatus === 'resource_exhausted' ||
    normalized.includes('rate limit') ||
    normalized.includes('quota') ||
    normalized.includes('out of searches') ||
    normalized.includes('no searches left')
  ) {
    category = 'quota';
    suffix = 'QUOTA_EXCEEDED';
    retryable = true;
  } else if (
    status === 401 ||
    apiStatus === 'unauthenticated' ||
    normalized.includes('invalid api key') ||
    normalized.includes('api key not valid') ||
    normalized.includes('unauthenticated')
  ) {
    category = 'credentials';
    suffix = 'INVALID_CREDENTIALS';
  } else if (
    status === 403 ||
    apiStatus === 'permission_denied' ||
    normalized.includes('permission denied') ||
    normalized.includes('forbidden') ||
    normalized.includes('billing')
  ) {
    category = 'permission';
    suffix = 'PERMISSION_DENIED';
  } else if (status === 404 || apiStatus === 'not_found') {
    category = 'not_found';
    suffix = 'NOT_FOUND';
  } else if (
    status === 408 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    apiStatus === 'unavailable'
  ) {
    category = 'upstream';
    suffix = 'UNAVAILABLE';
    retryable = true;
  } else if (status && status >= 500) {
    category = 'upstream';
    suffix = 'UPSTREAM_ERROR';
    retryable = true;
  }

  const messages: Record<ApiDiagnosticCategory, string> = {
    configuration: `${PROVIDER_LABELS[provider]} configuration is missing.`,
    credentials: `${PROVIDER_LABELS[provider]} rejected the configured credentials.`,
    permission: `${PROVIDER_LABELS[provider]} denied the request. Check permissions, restrictions, and billing.`,
    quota: `${PROVIDER_LABELS[provider]} quota or rate limit was exceeded.`,
    not_found: `${PROVIDER_LABELS[provider]} could not find the requested API resource or model.`,
    network: `${PROVIDER_LABELS[provider]} could not be reached.`,
    upstream: `${PROVIDER_LABELS[provider]} is temporarily unavailable.`,
    unknown: `${PROVIDER_LABELS[provider]} returned an unexpected error.`,
  };

  return {
    provider,
    service,
    code: `${provider.toUpperCase()}_${suffix}`,
    category,
    severity,
    message: messages[category],
    status,
    retryable,
  };
}

export function networkDiagnostic(
  provider: ApiProvider,
  service: string,
  severity: 'warning' | 'error' = 'error',
): ApiDiagnosticPayload {
  return {
    provider,
    service,
    code: `${provider.toUpperCase()}_NETWORK_ERROR`,
    category: 'network',
    severity,
    message: `${PROVIDER_LABELS[provider]} could not be reached.`,
    retryable: true,
  };
}

export function internalDiagnostic(
  service: string,
  severity: 'warning' | 'error' = 'error',
): ApiDiagnosticPayload {
  return {
    provider: 'supabase',
    service,
    code: 'SUPABASE_FUNCTION_ERROR',
    category: 'unknown',
    severity,
    message: 'The Supabase Edge Function encountered an unexpected error.',
    retryable: true,
  };
}

export function errorJsonResponse(
  diagnostic: ApiDiagnosticPayload,
  headers: Record<string, string>,
  status = diagnostic.status && diagnostic.status >= 400 ? diagnostic.status : 500,
): Response {
  return new Response(JSON.stringify({ error: diagnostic }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
