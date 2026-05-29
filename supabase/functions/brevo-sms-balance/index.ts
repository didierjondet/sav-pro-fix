import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// === AES-GCM Decryption (same key derivation as send-sms) ===
async function getDecryptionKey(): Promise<CryptoKey> {
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
    ["decrypt"]
  );
}

async function decryptConfig(encryptedData: string): Promise<Record<string, string>> {
  const key = await getDecryptionKey();
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Vérifier super admin
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', claims.claims.sub)
      .maybeSingle();

    if (profile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: super admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Récupérer le provider Brevo SMS actif
    const { data: providers, error: provErr } = await admin
      .from('messaging_providers')
      .select('id, provider, config_encrypted')
      .eq('type', 'sms')
      .eq('provider', 'brevo_sms')
      .eq('is_active', true)
      .limit(1);

    if (provErr) throw provErr;
    if (!providers || providers.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucun provider Brevo SMS actif. Configurez-le dans le menu "SMS / Mail".' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const config = await decryptConfig((providers[0] as any).config_encrypted);
    const apiKey = config.api_key;
    if (!apiKey) throw new Error('Clé API Brevo introuvable dans la configuration');

    // Appeler l'API Brevo
    const brevoResp = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: { 'api-key': apiKey, 'Accept': 'application/json' },
    });

    const brevoData = await brevoResp.json();
    if (!brevoResp.ok) {
      throw new Error(`Brevo API ${brevoResp.status}: ${brevoData.message || JSON.stringify(brevoData)}`);
    }

    // Extraire les crédits SMS du plan
    const plans = Array.isArray(brevoData.plan) ? brevoData.plan : [];
    const smsPlan = plans.find((p: any) => p.type === 'sms' || p.type === 'sms_credits' || (p.credits && p.creditsType === 'sendLimit' && p.type?.toLowerCase().includes('sms')));
    const smsCredits = Math.floor(Number(smsPlan?.credits ?? 0));
    const planName = smsPlan?.type || 'sms';

    // Mettre à jour le pot global
    await admin
      .from('global_sms_credits')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        total_credits: smsCredits,
        sync_status: 'ok',
        last_sync_at: new Date().toISOString(),
        twilio_balance_usd: 0,
      }, { onConflict: 'id' });

    return new Response(JSON.stringify({
      success: true,
      balance: smsCredits,
      plan_name: planName,
      account_email: brevoData.email,
      company: brevoData.companyName,
      last_sync_at: new Date().toISOString(),
      raw_plans: plans,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[brevo-sms-balance] error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
