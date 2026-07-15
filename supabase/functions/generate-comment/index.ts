import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  internalDiagnostic,
  missingConfigurationDiagnostic,
  networkDiagnostic,
  providerFailureDiagnostic,
  type ApiDiagnosticPayload,
} from "../_shared/api-diagnostics.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fallbackComment = "Weh this place confirm sedap, trust me bro! 🔥";

function fallbackResponse(diagnostic: ApiDiagnosticPayload) {
  return new Response(JSON.stringify({
    comment: fallbackComment,
    diagnostics: [{ ...diagnostic, severity: 'warning' }],
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { kedai } = await req.json();
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (!groqApiKey) {
      return fallbackResponse(missingConfigurationDiagnostic('groq', 'comment-generation', 'GROQ_API_KEY', 'warning'));
    }

    console.log('Generating Manglish comment for:', kedai.name);

    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: `You are a funny Malaysian food reviewer. Write in Manglish (Malaysian English mixed with Malay slang).
Be casual, funny, and use words like "boss", "weh", "confirm", "lah", "geng", "tapau", "shiok", "sedap gila".
Keep responses to 1-2 sentences max. Be playful and relatable to Malaysians.`
            },
            {
              role: 'user',
              content: `Write a funny Manglish comment about this restaurant:
Name: ${kedai.name}
Area: ${kedai.area}
Signature dish: ${kedai.signature}
Price: ${kedai.price_level}`
            }
          ],
          max_tokens: 100,
          temperature: 0.9,
        }),
      });
    } catch (error) {
      console.error('Groq network error:', error);
      return fallbackResponse(networkDiagnostic('groq', 'comment-generation', 'warning'));
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('Groq API error:', response.status, errorBody);
      return fallbackResponse(providerFailureDiagnostic(
        'groq',
        'comment-generation',
        response.status,
        errorBody,
        'warning',
      ));
    }

    const data = await response.json();
    const comment = data.choices[0]?.message?.content || "Sedap boss, try la!";

    console.log('Generated comment:', comment);

    return new Response(JSON.stringify({ comment }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error generating comment:', err);
    return fallbackResponse({ ...internalDiagnostic('comment-generation', 'warning'), severity: 'warning' });
  }
});
