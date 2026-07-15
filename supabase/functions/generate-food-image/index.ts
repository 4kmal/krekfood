import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  errorJsonResponse,
  internalDiagnostic,
  missingConfigurationDiagnostic,
  networkDiagnostic,
  providerFailureDiagnostic,
} from "../_shared/api-diagnostics.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signature, name } = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      return errorJsonResponse(
        missingConfigurationDiagnostic('gemini', 'food-image-generation', 'GEMINI_API_KEY'),
        corsHeaders,
      );
    }

    console.log('Generating food image for:', signature, name);

    // Generate food image using Gemini Imagen API
    let response: Response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{
                text: `Generate a delicious, appetizing food photo of Malaysian dish: "${signature}" from restaurant "${name}".
Make it look like a professional food photography shot with warm lighting, shallow depth of field, and mouth-watering presentation.
The dish should be the main focus, served on a nice plate with authentic Malaysian style. Ultra high resolution.`
              }]
            }
          ],
          generationConfig: {
            responseModalities: ['image', 'text'],
          }
        }),
      });
    } catch (error) {
      console.error('Image generation network error:', error);
      return errorJsonResponse(networkDiagnostic('gemini', 'food-image-generation'), corsHeaders, 503);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('Image generation error:', response.status, errorBody);
      return errorJsonResponse(
        providerFailureDiagnostic('gemini', 'food-image-generation', response.status, errorBody),
        corsHeaders,
        response.status,
      );
    }

    const data = await response.json();
    
    // Extract image from Gemini response
    const parts = data.candidates?.[0]?.content?.parts || [];
    let imageUrl: string | null = null;
    
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      console.error('No image in response:', data);
      return errorJsonResponse({
        provider: 'gemini',
        service: 'food-image-generation',
        code: 'GEMINI_IMAGE_MISSING',
        category: 'unknown',
        severity: 'error',
        message: 'Gemini returned a response without an image.',
        retryable: true,
      }, corsHeaders, 502);
    }

    console.log('Image generated successfully');

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error generating image:', err);
    return errorJsonResponse(internalDiagnostic('food-image-generation'), corsHeaders);
  }
});
