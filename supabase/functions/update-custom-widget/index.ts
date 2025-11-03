import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

const SYSTEM_PROMPT = `Tu es un expert en création de widgets de statistiques pour une application de gestion SAV.

SOURCES DE DONNÉES DISPONIBLES :
- sav_cases, parts, customers, sav_parts, quotes, shop_sav_types, shop_sav_statuses

TYPES DE WIDGETS :
1. KPI : Valeur numérique simple
2. Chart : Graphiques (line, bar, pie, area, radar)
3. Table : Tableau de données

Génère 3 configurations différentes en JSON incluant : name, description, widget_type, chart_type, data_source, data_config, display_config, reasoning.`;

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

    const { widget_id, new_prompt } = await req.json();

    if (!widget_id || !new_prompt) {
      return new Response(JSON.stringify({ error: "Missing widget_id or new_prompt" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Updating widget", widget_id, "with new prompt:", new_prompt);

    // Verify widget belongs to user's shop
    const { data: existingWidget } = await supabaseClient
      .from("custom_widgets")
      .select("*")
      .eq("id", widget_id)
      .eq("shop_id", profile.shop_id)
      .single();

    if (!existingWidget) {
      return new Response(JSON.stringify({ error: "Widget not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Call Gemini API to regenerate suggestions
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}\n\nPROMPT UTILISATEUR: ${new_prompt}\n\nGénère 3 suggestions de widgets en JSON.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!geminiResponse.ok) {
      console.error("Gemini API error");
      return new Response(JSON.stringify({ error: "Failed to generate suggestions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      return new Response(JSON.stringify({ error: "No suggestions generated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Parse JSON
    let jsonText = generatedText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const aiResponse = JSON.parse(jsonText);

    // Replace {shop_id} placeholders
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
        original_widget: existingWidget,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in update-custom-widget:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});