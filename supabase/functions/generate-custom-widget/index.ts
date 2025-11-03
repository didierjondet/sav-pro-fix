import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un expert en création de widgets de statistiques pour une application de gestion SAV (Service Après-Vente).

SOURCES DE DONNÉES DISPONIBLES :
- sav_cases : dossiers SAV (status, device_brand, device_model, total_cost, created_at, sav_type, etc.)
- parts : pièces détachées (name, quantity, selling_price, purchase_price, supplier, etc.)
- customers : clients (first_name, last_name, email, phone, address, etc.)
- sav_parts : pièces utilisées dans les SAV (quantity, unit_price, time_minutes)
- quotes : devis (quote_number, total_amount, status, items, created_at)
- shop_sav_types : types de SAV personnalisés par magasin
- shop_sav_statuses : statuts SAV personnalisés par magasin

TYPES DE WIDGETS POSSIBLES :
1. KPI : Valeur numérique simple avec icône (ex: total CA, nombre de SAV, taux de satisfaction)
2. Chart : Graphiques variés (line, bar, pie, area)
3. Table : Tableau de données avec colonnes personnalisables

TON RÔLE :
- Analyser le prompt utilisateur
- Proposer 3 configurations de widgets DIFFÉRENTES mais pertinentes
- Utiliser des icônes lucide-react (TrendingUp, Package, Activity, DollarSign, Users, etc.)

RÉPONDS UNIQUEMENT avec un JSON valide au format :
{
  "interpretation": "Ton analyse du besoin",
  "suggestions": [
    {
      "name": "Nom court",
      "description": "Description détaillée",
      "widget_type": "kpi|chart|table",
      "chart_type": "line|bar|pie|area",
      "data_source": "sav_cases",
      "data_config": {
        "table": "sav_cases",
        "select": "id, created_at, total_cost",
        "filters": [{"column": "shop_id", "operator": "eq", "value": "{shop_id}"}],
        "aggregations": [],
        "orderBy": "created_at",
        "limit": 100
      },
      "display_config": {
        "color": "hsl(var(--primary))",
        "icon": "TrendingUp",
        "size": "medium"
      },
      "reasoning": "Pourquoi cette approche"
    }
  ]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("shop_id")
      .eq("user_id", userData.user.id)
      .single();

    if (!profile?.shop_id) {
      return new Response(JSON.stringify({ error: "Shop not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const { prompt } = await req.json();

    if (!prompt || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Generating widget suggestions for prompt:", prompt);

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your Lovable workspace." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 402,
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to generate suggestions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData, null, 2));

    const generatedText = aiData.choices?.[0]?.message?.content;
    
    if (!generatedText) {
      console.error("No text generated from AI");
      return new Response(JSON.stringify({ error: "No suggestions generated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    let jsonText = generatedText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const parsedResponse = JSON.parse(jsonText);

    const processedSuggestions = parsedResponse.suggestions.map((suggestion: any) => ({
      ...suggestion,
      data_config: {
        ...suggestion.data_config,
        filters: suggestion.data_config.filters?.map((filter: any) => ({
          ...filter,
          value: filter.value === "{shop_id}" ? profile.shop_id : filter.value
        })) || []
      }
    }));

    return new Response(
      JSON.stringify({
        interpretation: parsedResponse.interpretation,
        suggestions: processedSuggestions,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-custom-widget:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});