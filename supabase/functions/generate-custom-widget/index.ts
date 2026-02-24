import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// === AES-GCM Decryption Helper ===
async function getDecryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("AI_ENCRYPTION_KEY") || "default-fallback-key-change-me";
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32)), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: new TextEncoder().encode("ai-config-salt"), iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}
async function decryptApiKey(encrypted: string): Promise<string> {
  const key = await getDecryptionKey();
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function getAIConfig(supabaseClient: any) {
  try {
    const { data } = await supabaseClient.from("ai_engine_config").select("*").eq("is_active", true).maybeSingle();
    if (!data || data.provider === "lovable") {
      return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY"), model: data?.model || "google/gemini-2.5-flash" };
    }
    let apiKey: string | undefined;
    if (data.encrypted_api_key) {
      try { apiKey = await decryptApiKey(data.encrypted_api_key); } catch (e) { console.error("Decrypt failed:", e); }
    }
    if (!apiKey) apiKey = Deno.env.get(data.api_key_name);
    if (!apiKey) {
      return { error: `Clé API ${data.provider} non configurée. Allez dans Super Admin > Moteur IA pour saisir votre clé API.` };
    }
    switch (data.provider) {
      case "openai": return { url: "https://api.openai.com/v1/chat/completions", apiKey, model: data.model };
      case "gemini": return { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", apiKey, model: data.model };
      default: return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY"), model: data.model };
    }
  } catch (e) {
    return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY"), model: "google/gemini-2.5-flash" };
  }
}

const SYSTEM_PROMPT = `Tu es un expert en création de widgets de statistiques pour une application de gestion SAV.

📊 VARIABLES PRÉDÉFINIES DISPONIBLES (utiliser UNIQUEMENT ces variables) :

**MÉTRIQUES MENSUELLES** (évolution par mois) :
- monthly_revenue : Revenu mensuel (SAV avec status='ready' uniquement)
- monthly_sav_count : Nombre de SAV créés par mois
- monthly_margin : Marge mensuelle (revenu - coûts des pièces)
- monthly_costs : Coûts totaux des pièces par mois
- monthly_client_revenue : Revenu des SAV type client
- monthly_external_revenue : Revenu des SAV type externe

**MÉTRIQUES AGRÉGÉES** (totaux) :
- total_revenue : Revenu total sur la période
- average_sav_time : Temps moyen de réparation (heures)
- late_rate_percentage : Taux de retard (%)
- takeover_amount : Montant total des prises en charge

**CLASSEMENTS** (top 5) :
- top_parts_usage : Pièces les plus utilisées
- top_devices : Appareils les plus réparés

⚠️ **RÈGLE ABSOLUE** : Tu dois UNIQUEMENT utiliser ces variables prédéfinies. Ne génère JAMAIS de SQL ni de requêtes personnalisées.

📝 **FORMAT DE CONFIGURATION** :

Pour un graphique d'évolution mensuelle :
{
  "widget_type": "chart",
  "chart_type": "line",
  "data_config": {
    "metrics": ["monthly_revenue", "monthly_margin"],
    "groupBy": "month",
    "filters": { "year": 2025, "status": "ready" }
  },
  "display_config": {
    "xAxis": { "key": "month", "label": "Mois" },
    "lines": [
      { "key": "monthly_revenue", "label": "Revenu", "color": "hsl(142, 76%, 36%)" },
      { "key": "monthly_margin", "label": "Marge", "color": "hsl(221, 83%, 53%)" }
    ]
  }
}

Pour un KPI simple :
{
  "widget_type": "kpi",
  "data_config": {
    "metrics": ["total_revenue"],
    "filters": { "year": 2025 }
  },
  "display_config": {
    "icon": "TrendingUp",
    "color": "hsl(var(--primary))"
  }
}

Pour un tableau de classement :
{
  "widget_type": "table",
  "data_config": {
    "metrics": ["top_parts_usage"],
    "filters": { "year": 2025 }
  },
  "display_config": {
    "columns": ["name", "count"]
  }
}

🤝 **TON RÔLE** :
1. Identifier les variables nécessaires pour répondre à la demande
2. Dans "interpretation", lister clairement : "Ce widget utilisera : **monthly_margin** (marge mensuelle = revenu - coûts des pièces)"
3. Proposer 3 configurations DIFFÉRENTES mais pertinentes
4. **UTILISER L'ANNÉE COURANTE (2025) PAR DÉFAUT** sauf si l'utilisateur spécifie une autre année
5. Demander TOUJOURS confirmation : "Confirmez-vous que ces variables correspondent à votre besoin ?"

RÉPONDS UNIQUEMENT avec un JSON valide au format :
{
  "interpretation": "Analyse détaillée + variables utilisées + question de confirmation",
  "suggestions": [
    {
      "name": "Nom court du widget",
      "description": "Description détaillée",
      "widget_type": "kpi|chart|table",
      "chart_type": "line|bar|pie|area",
      "data_source": "custom_metrics",
      "data_config": {
        "metrics": ["monthly_revenue", "monthly_margin"],
        "groupBy": "month",
        "filters": { "year": 2025 }
      },
      "display_config": {
        "color": "hsl(var(--primary))",
        "icon": "TrendingUp"
      },
      "reasoning": "Pourquoi cette approche + détails sur les variables"
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

    const aiConfig = await getAIConfig(supabaseClient);

    const aiResponse = await fetch(aiConfig.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
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

    // Les suggestions sont déjà au bon format, pas besoin de transformation
    // filters est un objet { year: 2025 }, pas un tableau
    // shop_id est géré automatiquement dans useCustomWidgetData
    return new Response(
      JSON.stringify({
        interpretation: parsedResponse.interpretation,
        suggestions: parsedResponse.suggestions,
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