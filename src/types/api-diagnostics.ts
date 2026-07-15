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

export type ApiDiagnosticSeverity = 'warning' | 'error';

export interface ApiDiagnosticPayload {
  provider: ApiProvider;
  service: string;
  code: string;
  category: ApiDiagnosticCategory;
  severity: ApiDiagnosticSeverity;
  message: string;
  status?: number;
  retryable: boolean;
}

export interface ApiDiagnosticInput extends ApiDiagnosticPayload {
  source: string;
}

export interface ApiDiagnostic extends ApiDiagnosticInput {
  id: string;
  timestamp: string;
  occurrences: number;
}

export interface ProviderMetadata {
  label: string;
  dashboardUrl: string;
  action: string;
}

export const PROVIDER_METADATA: Record<ApiProvider, ProviderMetadata> = {
  gemini: {
    label: 'Gemini',
    dashboardUrl: 'https://aistudio.google.com/app/apikey',
    action: 'Check the Gemini key, model access, and quota in Google AI Studio.',
  },
  nine_router: {
    label: '9Router',
    dashboardUrl: 'https://router.mypeta.link/dashboard/quota',
    action: 'Check the 9Router API key, model availability, provider connections, and quota.',
  },
  serpapi: {
    label: 'SerpAPI',
    dashboardUrl: 'https://serpapi.com/dashboard',
    action: 'Check the SerpAPI key and remaining searches.',
  },
  google_maps: {
    label: 'Google Maps',
    dashboardUrl: 'https://console.cloud.google.com/google/maps-apis/credentials',
    action: 'Check the API key, billing, enabled APIs, and website restrictions.',
  },
  supabase: {
    label: 'Supabase',
    dashboardUrl: 'https://supabase.com/dashboard',
    action: 'Check authentication, Edge Function status, secrets, and logs.',
  },
  groq: {
    label: 'Groq',
    dashboardUrl: 'https://console.groq.com/keys',
    action: 'Check the Groq key, model access, and quota.',
  },
};

export function isApiDiagnosticPayload(value: unknown): value is ApiDiagnosticPayload {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<ApiDiagnosticPayload>;
  const providers: ApiProvider[] = ['gemini', 'nine_router', 'serpapi', 'google_maps', 'supabase', 'groq'];
  const categories: ApiDiagnosticCategory[] = [
    'configuration',
    'credentials',
    'permission',
    'quota',
    'not_found',
    'network',
    'upstream',
    'unknown',
  ];
  return (
    providers.includes(candidate.provider as ApiProvider) &&
    typeof candidate.service === 'string' &&
    typeof candidate.code === 'string' &&
    categories.includes(candidate.category as ApiDiagnosticCategory) &&
    (candidate.severity === 'warning' || candidate.severity === 'error') &&
    typeof candidate.message === 'string' &&
    (candidate.status === undefined || typeof candidate.status === 'number') &&
    typeof candidate.retryable === 'boolean'
  );
}

export function getConciseDiagnosticMessage(diagnostic: ApiDiagnosticPayload): string {
  const provider = PROVIDER_METADATA[diagnostic.provider].label;

  switch (diagnostic.category) {
    case 'quota':
      return `${provider} quota is currently exhausted. Please try again later.`;
    case 'configuration':
    case 'credentials':
    case 'permission':
      return `${provider} configuration needs attention. Check API diagnostics for details.`;
    case 'network':
      return `${provider} could not be reached. Check the connection and try again.`;
    case 'upstream':
      return `${provider} is temporarily unavailable. Please try again shortly.`;
    case 'not_found':
      return `${provider} could not find the requested API, model, or function.`;
    default:
      return `${provider} returned an unexpected error. Check API diagnostics for details.`;
  }
}
