import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Verify super admin
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Accès réservé aux super administrateurs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { provider, model, api_key_name, api_key, test_only } = await req.json();

    // === LOVABLE PROVIDER: always pre-configured, no key needed ===
    if (provider === "lovable") {
      if (test_only) {
        return new Response(JSON.stringify({ success: true, message: "Lovable AI est pré-configuré et prêt à l'emploi." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save config without API key
      await supabaseClient
        .from("ai_engine_config")
        .update({ is_active: false })
        .eq("is_active", true);

      const { error: insertError } = await supabaseClient
        .from("ai_engine_config")
        .insert({ provider, model, api_key_name, is_active: true });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === NON-LOVABLE PROVIDERS (OpenAI, Gemini, etc.) ===

    // Resolve the API key: use provided key, or fall back to stored key in DB
    let resolvedApiKey: string | undefined = api_key || undefined;

    if (!resolvedApiKey) {
      // Try to get the stored key from the active config in DB
      const { data: existingConfig } = await supabaseClient
        .from("ai_engine_config")
        .select("encrypted_api_key")
        .eq("provider", provider)
        .eq("is_active", true)
        .maybeSingle();

      resolvedApiKey = existingConfig?.encrypted_api_key || undefined;
    }

    // Test connection
    if (test_only) {
      if (!resolvedApiKey) {
        return new Response(JSON.stringify({ error: "Clé API manquante. Veuillez saisir une clé API." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const testResult = await testAIConnection(provider, model, resolvedApiKey);
      if (!testResult.success) {
        return new Response(JSON.stringify({ error: testResult.error }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Connexion réussie" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save config
    if (!resolvedApiKey) {
      return new Response(JSON.stringify({ error: "Clé API manquante pour ce fournisseur." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Deactivate all existing configs
    await supabaseClient
      .from("ai_engine_config")
      .update({ is_active: false })
      .eq("is_active", true);

    // Insert new config WITH the API key stored
    const { error: insertError } = await supabaseClient
      .from("ai_engine_config")
      .insert({
        provider,
        model,
        api_key_name,
        is_active: true,
        encrypted_api_key: resolvedApiKey,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in save-ai-config:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function testAIConnection(provider: string, model: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    let url: string;
    let headers: Record<string, string>;

    switch (provider) {
      case "openai":
        url = "https://api.openai.com/v1/chat/completions";
        headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        break;
      case "gemini":
        url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        break;
      default:
        return { success: false, error: "Provider inconnu" };
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Test. Réponds juste 'OK'." }],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Test failed:", response.status, errorText);
      return { success: false, error: `Erreur ${response.status}: ${errorText.substring(0, 200)}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
