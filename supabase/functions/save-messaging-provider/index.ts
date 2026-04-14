import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// === AES-GCM Encryption (same as save-ai-config) ===
async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("AI_ENCRYPTION_KEY") || "default-fallback-key-change-me";
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("messaging-config-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

async function encryptConfig(config: Record<string, string>): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(config));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

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

    const { type, provider, name, config, from_address } = await req.json();

    if (!type || !provider || !name) {
      return new Response(JSON.stringify({ error: "Paramètres manquants (type, provider, name)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Encrypt config if provided
    let encryptedConfig = null;
    if (config && Object.keys(config).length > 0) {
      const encrypted = await encryptConfig(config);
      encryptedConfig = { data: encrypted };
    }

    console.log(`Saving messaging provider: type=${type}, provider=${provider}, name=${name}`);

    const { error: insertError } = await supabaseClient
      .from("messaging_providers")
      .insert({
        type,
        provider,
        name,
        encrypted_config: encryptedConfig,
        from_address: from_address || null,
        is_active: false,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in save-messaging-provider:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
