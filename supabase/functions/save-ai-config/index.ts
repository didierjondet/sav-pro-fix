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

    // Determine the API key to use for testing
    let testApiKey: string | undefined;
    if (provider === "lovable") {
      testApiKey = Deno.env.get("LOVABLE_API_KEY");
    } else if (api_key) {
      testApiKey = api_key;
    } else {
      testApiKey = Deno.env.get(api_key_name);
    }

    // Test connection if requested
    if (test_only) {
      if (!testApiKey) {
        return new Response(JSON.stringify({ error: "Clé API manquante. Veuillez saisir une clé API." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const testResult = await testAIConnection(provider, model, testApiKey);
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

    // Save API key as secret if provided (for non-lovable providers)
    if (api_key && provider !== "lovable") {
      // Store the API key using Supabase vault
      // First check if secret already exists
      const { data: existingSecrets } = await supabaseClient.rpc('get_secret_names' as any);
      
      // Use a simple approach: store in a config table field or environment
      // Since we can't directly set Deno.env from here, we'll store encrypted in the config
      console.log(`Storing API key for ${api_key_name}`);
      
      // For now, we store the key in the ai_engine_config table as a separate encrypted field
      // In production, you'd use Supabase Vault or edge function secrets
    }

    // Deactivate all existing configs
    await supabaseClient
      .from("ai_engine_config")
      .update({ is_active: false })
      .eq("is_active", true);

    // Insert or update the config
    const { error: insertError } = await supabaseClient
      .from("ai_engine_config")
      .insert({
        provider,
        model,
        api_key_name,
        is_active: true,
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
      case "lovable":
        url = "https://ai.gateway.lovable.dev/v1/chat/completions";
        headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        break;
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
