import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  missingConfigurationDiagnostic,
  type ApiDiagnosticPayload,
} from "./api-diagnostics.ts";

export class AuthenticationError extends Error {
  diagnostic: ApiDiagnosticPayload;

  constructor(diagnostic: ApiDiagnosticPayload) {
    super(diagnostic.message);
    this.name = 'AuthenticationError';
    this.diagnostic = diagnostic;
  }
}

function authenticationRequiredDiagnostic(): ApiDiagnosticPayload {
  return {
    provider: 'supabase',
    service: 'authentication',
    code: 'SUPABASE_AUTH_REQUIRED',
    category: 'credentials',
    severity: 'error',
    message: 'A signed-in Supabase user is required.',
    status: 401,
    retryable: false,
  };
}

export async function requireAuthenticatedUser(req: Request): Promise<string> {
  const authorization = req.headers.get('Authorization')?.trim() || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new AuthenticationError(authenticationRequiredDiagnostic());

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!supabaseUrl) {
    throw new AuthenticationError(
      missingConfigurationDiagnostic('supabase', 'authentication', 'SUPABASE_URL'),
    );
  }
  if (!serviceRoleKey) {
    throw new AuthenticationError(
      missingConfigurationDiagnostic('supabase', 'authentication', 'SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user) {
    throw new AuthenticationError(authenticationRequiredDiagnostic());
  }

  return data.user.id;
}
