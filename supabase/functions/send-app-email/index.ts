import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// === AES-GCM Decryption (compatible save-messaging-provider) ===
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

interface EmailProvider {
  provider: string;
  config: Record<string, string>;
  from_address: string | null;
}

async function getActiveEmailProvider(supabase: any): Promise<EmailProvider | null> {
  const { data } = await supabase
    .from('messaging_providers')
    .select('*')
    .eq('type', 'email')
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return null;

  let config: Record<string, string> = {};
  if (data.encrypted_config?.data) {
    try {
      config = await decryptConfig(data.encrypted_config.data);
    } catch (e) {
      console.error('decryptConfig failed:', e);
    }
  }
  return { provider: data.provider, config, from_address: data.from_address };
}

// === Email sending adapters ===
async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string) {
  const resend = new Resend(apiKey);
  return await resend.emails.send({ from, to: [to], subject, html });
}

async function sendViaBrevoEmail(apiKey: string, from: string, fromName: string, to: string, subject: string, html: string) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: fromName || 'FixWay', email: from },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Brevo API ${response.status}: ${data?.message || JSON.stringify(data)}`);
  }
  return data;
}

async function dispatchEmail(provider: EmailProvider | null, to: string, subject: string, html: string): Promise<{ provider: string; result: any }> {
  // Fallback Resend si aucun provider actif
  if (!provider) {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("Aucun fournisseur email actif et RESEND_API_KEY non configuré");
    }
    const result = await sendViaResend(resendKey, "FixWay <noreply@fixway.fr>", to, subject, html);
    return { provider: 'resend_fallback', result };
  }

  switch (provider.provider) {
    case 'brevo_email': {
      const apiKey = provider.config.api_key;
      if (!apiKey) throw new Error("Clé API Brevo manquante dans la configuration");
      const fromEmail = provider.config.from_email || provider.from_address || 'noreply@fixway.fr';
      const fromName = provider.config.from_name || 'FixWay';
      const result = await sendViaBrevoEmail(apiKey, fromEmail, fromName, to, subject, html);
      return { provider: 'brevo_email', result };
    }
    case 'resend': {
      const apiKey = provider.config.api_key || Deno.env.get("RESEND_API_KEY");
      if (!apiKey) throw new Error("Clé API Resend manquante");
      const fromEmail = provider.config.from_email || provider.from_address || 'noreply@fixway.fr';
      const from = `FixWay <${fromEmail}>`;
      const result = await sendViaResend(apiKey, from, to, subject, html);
      return { provider: 'resend', result };
    }
    case 'smtp': {
      // SMTP non supporté nativement en Edge Function Deno, fallback Resend
      console.warn('SMTP provider not supported in Edge Functions, falling back to Resend');
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) throw new Error("SMTP non supporté et RESEND_API_KEY absent pour fallback");
      const result = await sendViaResend(resendKey, "FixWay <noreply@fixway.fr>", to, subject, html);
      return { provider: 'resend_fallback', result };
    }
    default:
      throw new Error(`Fournisseur email inconnu: ${provider.provider}`);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let toEmail = '';
  let subject = '';
  let context = 'unknown';
  let shopId: string | null = null;

  try {
    const body = await req.json();
    toEmail = (body.to || body.toEmail || '').trim();
    subject = body.subject || '';
    const html = body.html || '';
    context = body.context || 'unknown';
    shopId = body.shopId || null;

    if (!toEmail) throw new Error("Paramètre 'to' (destinataire) manquant");
    if (!subject) throw new Error("Paramètre 'subject' manquant");
    if (!html) throw new Error("Paramètre 'html' manquant");

    // Validation email basique
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      throw new Error(`Adresse email invalide: ${toEmail}`);
    }

    const provider = await getActiveEmailProvider(supabase);
    console.log(`📧 [send-app-email] context=${context} provider=${provider?.provider || 'fallback'} to=${toEmail}`);

    const { provider: usedProvider, result } = await dispatchEmail(provider, toEmail, subject, html);

    // Log success
    await supabase.from('email_send_logs').insert({
      shop_id: shopId,
      provider: usedProvider,
      to_email: toEmail,
      subject,
      status: 'sent',
      context,
    });

    return new Response(JSON.stringify({ success: true, provider: usedProvider, result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[send-app-email] error:', error);

    // Log failure (best-effort)
    try {
      await supabase.from('email_send_logs').insert({
        shop_id: shopId,
        provider: 'unknown',
        to_email: toEmail || 'unknown',
        subject: subject || null,
        status: 'failed',
        error_message: String(error?.message || error).slice(0, 1000),
        context,
      });
    } catch (logErr) {
      console.error('Failed to write error log:', logErr);
    }

    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
