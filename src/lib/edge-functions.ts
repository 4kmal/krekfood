import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  isApiDiagnosticPayload,
  type ApiDiagnosticCategory,
  type ApiDiagnosticPayload,
  type ApiProvider,
} from '@/types/api-diagnostics';

interface InvokeOptions {
  body?: unknown;
  headers?: Record<string, string>;
}

interface DiagnosticEnvelope {
  diagnostics?: unknown;
  error?: unknown;
}

export interface EdgeFunctionResult<T> {
  data: T;
  diagnostics: ApiDiagnosticPayload[];
}

export class ApiDiagnosticError extends Error {
  diagnostic: ApiDiagnosticPayload;

  constructor(diagnostic: ApiDiagnosticPayload) {
    super(diagnostic.message);
    this.name = 'ApiDiagnosticError';
    this.diagnostic = diagnostic;
  }
}

function fallbackDiagnostic(
  functionName: string,
  category: ApiDiagnosticCategory,
  status?: number,
): ApiDiagnosticPayload {
  const codeByCategory: Partial<Record<ApiDiagnosticCategory, string>> = {
    network: 'SUPABASE_FUNCTION_NETWORK',
    not_found: 'SUPABASE_FUNCTION_NOT_FOUND',
    upstream: 'SUPABASE_FUNCTION_UNAVAILABLE',
    credentials: 'SUPABASE_FUNCTION_UNAUTHORIZED',
    permission: 'SUPABASE_FUNCTION_FORBIDDEN',
    quota: 'SUPABASE_FUNCTION_RATE_LIMIT',
  };
  const code = codeByCategory[category] ?? 'SUPABASE_FUNCTION_ERROR';

  return {
    provider: 'supabase',
    service: functionName,
    code,
    category,
    severity: 'error',
    message: category === 'network'
      ? 'The Supabase Edge Function could not be reached.'
      : category === 'not_found'
        ? `The ${functionName} Edge Function was not found.`
        : category === 'quota'
          ? 'The Supabase Edge Function rate limit was exceeded.'
          : category === 'credentials' || category === 'permission'
            ? 'Supabase rejected the Edge Function request.'
            : 'The Supabase Edge Function returned an unexpected error.',
    status,
    retryable: category === 'network' || category === 'upstream' || category === 'quota',
  };
}

function diagnosticFromLegacyError(functionName: string, message: string): ApiDiagnosticPayload {
  const normalized = message.toLowerCase();
  let provider: ApiProvider = 'supabase';

  if (normalized.includes('gemini')) provider = 'gemini';
  if (normalized.includes('9router') || normalized.includes('nine_router')) provider = 'nine_router';
  if (normalized.includes('serpapi')) provider = 'serpapi';
  if (normalized.includes('groq')) provider = 'groq';

  const category: ApiDiagnosticCategory = normalized.includes('not configured') || normalized.includes('missing')
    ? 'configuration'
    : normalized.includes('rate') || normalized.includes('quota') || normalized.includes('429')
      ? 'quota'
      : normalized.includes('network') || normalized.includes('fetch')
        ? 'network'
        : 'unknown';

  return {
    provider,
    service: functionName,
    code: `${provider.toUpperCase()}_LEGACY_ERROR`,
    category,
    severity: 'error',
    message: `${provider === 'google_maps'
      ? 'Google Maps'
      : provider === 'nine_router'
        ? '9Router'
        : provider.charAt(0).toUpperCase() + provider.slice(1)} returned an error.`,
    retryable: category === 'quota' || category === 'network',
  };
}

async function readHttpDiagnostic(
  error: FunctionsHttpError,
  functionName: string,
): Promise<ApiDiagnosticPayload> {
  const response = error.context instanceof Response ? error.context : null;
  const status = response?.status;

  if (response) {
    try {
      const payload = await response.clone().json() as DiagnosticEnvelope;
      if (isApiDiagnosticPayload(payload.error)) {
        return payload.error;
      }
    } catch {
      // Fall back to the HTTP status when an older function returns non-JSON content.
    }
  }

  if (status === 404) return fallbackDiagnostic(functionName, 'not_found', status);
  if (status === 401) return fallbackDiagnostic(functionName, 'credentials', status);
  if (status === 403) return fallbackDiagnostic(functionName, 'permission', status);
  if (status === 429) return fallbackDiagnostic(functionName, 'quota', status);
  if (status && status >= 500) return fallbackDiagnostic(functionName, 'upstream', status);
  return fallbackDiagnostic(functionName, 'unknown', status);
}

async function normalizeFunctionError(error: unknown, functionName: string): Promise<ApiDiagnosticPayload> {
  if (error instanceof FunctionsHttpError) {
    return readHttpDiagnostic(error, functionName);
  }

  if (error instanceof FunctionsFetchError) {
    return fallbackDiagnostic(functionName, 'network');
  }

  if (error instanceof FunctionsRelayError) {
    const response = error.context instanceof Response ? error.context : null;
    return fallbackDiagnostic(functionName, 'upstream', response?.status);
  }

  return fallbackDiagnostic(functionName, 'unknown');
}

export async function invokeEdgeFunction<T>(
  functionName: string,
  options: InvokeOptions,
): Promise<EdgeFunctionResult<T>> {
  const { data, error } = await supabase.functions.invoke(functionName, options);

  if (error) {
    throw new ApiDiagnosticError(await normalizeFunctionError(error, functionName));
  }

  const envelope = (data ?? {}) as DiagnosticEnvelope;
  if (typeof envelope.error === 'string') {
    throw new ApiDiagnosticError(diagnosticFromLegacyError(functionName, envelope.error));
  }
  if (isApiDiagnosticPayload(envelope.error)) {
    throw new ApiDiagnosticError(envelope.error);
  }

  const diagnostics = Array.isArray(envelope.diagnostics)
    ? envelope.diagnostics.filter(isApiDiagnosticPayload)
    : [];

  return { data: data as T, diagnostics };
}
