import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

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
2. Chart : Graphiques variés (line, bar, pie, area, radar)
3. Table : Tableau de données avec colonnes personnalisables

TON RÔLE :
- Analyser le prompt utilisateur
- Proposer 3 configurations de widgets DIFFÉRENTES mais pertinentes
- Chaque configuration doit inclure :
  * name : Nom court et descriptif
  * description : Description claire du widget
  * widget_type : Type (kpi/chart/table)
  * chart_type : Type de graphique si applicable (line, bar, pie, area, radar)
  * data_source : Table principale à utiliser
  * data_config : Configuration précise des filtres, agrégations, groupements
  * display_config : Couleurs, icônes, taille suggérée
  * reasoning : Explication de pourquoi cette approche

RÈGLES IMPORTANTES :
- Les 3 suggestions doivent être DIFFÉRENTES (types différents ou approches différentes)
- Utiliser des données réalistes et calculables
- Préférer des agrégations simples (COUNT, SUM, AVG)
- Toujours filtrer par shop_id pour la sécurité
- Utiliser des icônes lucide-react pertinentes

RÉPONDS UNIQUEMENT avec un JSON valide au format :
{
  "interpretation": "Ton analyse du besoin utilisateur",
  "suggestions": [
    {
      "name": "Nom court",
      "description": "Description détaillée",
      "widget_type": "kpi|chart|table",
      "chart_type": "line|bar|pie|area|radar",
      "data_source": "sav_cases",
      "data_config": {
        "table": "sav_cases",
        "select": "id, created_at, total_cost",
        "filters": [{"column": "shop_id", "operator": "eq", "value": "{shop_id}"}],
        "aggregations": [{"function": "count", "column": "id", "alias": "total"}],
        "groupBy": "DATE(created_at)",
        "orderBy": "created_at",
        "limit": 100
      },
      "display_config": {
        "color": "hsl(var(--primary))",
        "icon": "TrendingUp",
        "size": "medium",
        "showLegend": true,
        "showLabels": true
      },
      "reasoning": "Pourquoi cette approche est pertinente"
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

    // Authenticate user
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

    // Get user's shop_id
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

    // Call Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}\n\nPROMPT UTILISATEUR: ${prompt}\n\nGénère 3 suggestions de widgets différentes et pertinentes en JSON.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to generate suggestions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini response:", JSON.stringify(geminiData, null, 2));

    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error("No text generated from Gemini");
      return new Response(JSON.stringify({ error: "No suggestions generated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Parse JSON from generated text (remove markdown code blocks if present)
    let jsonText = generatedText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const aiResponse = JSON.parse(jsonText);

    // Replace {shop_id} placeholders with actual shop_id
    const processedSuggestions = aiResponse.suggestions.map((suggestion: any) => ({
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
        interpretation: aiResponse.interpretation,
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