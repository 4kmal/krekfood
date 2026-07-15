import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { errorJsonResponse, internalDiagnostic } from "../_shared/api-diagnostics.ts";
import {
  getNineRouterDefaultModel,
  listNineRouterModels,
  NineRouterError,
} from "../_shared/nine-router.ts";
import {
  AuthenticationError,
  requireAuthenticatedUser,
} from "../_shared/require-user.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await requireAuthenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    const models = await listNineRouterModels(body?.refresh === true);
    return new Response(JSON.stringify({
      models,
      defaultModel: getNineRouterDefaultModel(),
      diagnostics: [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorJsonResponse(error.diagnostic, corsHeaders, error.diagnostic.status);
    }
    if (error instanceof NineRouterError) {
      return errorJsonResponse(error.diagnostic, corsHeaders);
    }
    console.error('Unexpected model discovery error:', error);
    return errorJsonResponse(internalDiagnostic('ai-models'), corsHeaders);
  }
});
