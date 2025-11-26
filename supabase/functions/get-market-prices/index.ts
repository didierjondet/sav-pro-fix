import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Tu es un expert en réparation d'appareils électroniques (smartphones, tablettes, PC, consoles) en France.

Pour chaque pièce détachée donnée, estime le PRIX DE LA PRESTATION COMPLÈTE sur le marché français, c'est-à-dire le prix que facture un réparateur professionnel au client final, incluant :
- Le coût de la pièce de remplacement
- La main d'œuvre pour effectuer la réparation

Exemples d'interprétation :
- "Écran iPhone 11" → Prix moyen pour "Changement d'écran iPhone 11" (pièce + pose)
- "Batterie Samsung S21" → Prix moyen pour "Remplacement batterie Samsung S21" (pièce + pose)
- "Connecteur de charge Huawei P30" → Prix moyen pour "Réparation connecteur de charge Huawei P30"

Règles importantes :
- Les prix sont en euros TTC
- Arrondis au nombre entier le plus proche
- Base-toi sur les tarifs moyens pratiqués par les réparateurs indépendants en France (ni low-cost ni Apple Store/SAV officiel)
- Inclus TOUJOURS la main d'œuvre dans ton estimation

Réponds UNIQUEMENT avec un objet JSON au format: { "nom_piece_1": prix_prestation_estimé, "nom_piece_2": prix_prestation_estimé, ... }`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partNames } = await req.json();
    
    if (!Array.isArray(partNames) || partNames.length === 0) {
      return new Response(
        JSON.stringify({ error: 'partNames must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construire le prompt avec la liste des pièces
    const userPrompt = `Estime les prix moyens des PRESTATIONS DE RÉPARATION (pièce + main d'œuvre incluse) pour ces pièces:\n${partNames.join('\n')}`;

    console.log('Calling Lovable AI Gateway for market prices estimation...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Basse température pour des estimations plus cohérentes
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    // Parser la réponse JSON de l'IA
    let marketPrices: Record<string, number> = {};
    try {
      // Extraire le JSON de la réponse (au cas où l'IA ajoute du texte autour)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        marketPrices = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, 'Raw response:', aiResponse);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ marketPrices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-market-prices function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
