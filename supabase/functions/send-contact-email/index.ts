import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// === AES-GCM Decryption ===
async function getDecryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("AI_ENCRYPTION_KEY") || "default-fallback-key-change-me";
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32)),
    { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("messaging-config-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
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
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

interface EmailProvider {
  provider: string;
  config: Record<string, string>;
  from_address: string | null;
}

async function getActiveEmailProvider(supabaseClient: any): Promise<EmailProvider | null> {
  const { data } = await supabaseClient
    .from('messaging_providers')
    .select('*')
    .eq('type', 'email')
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return null;

  let config: Record<string, string> = {};
  if (data.encrypted_config?.data) {
    config = await decryptConfig(data.encrypted_config.data);
  }

  return { provider: data.provider, config, from_address: data.from_address };
}

async function sendEmail(provider: EmailProvider | null, to: string, subject: string, html: string) {
  if (!provider) {
    // Fallback: Resend with env key
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    return await resend.emails.send({ from: "FixWay <noreply@fixway.fr>", to: [to], subject, html });
  }

  switch (provider.provider) {
    case 'resend': {
      const apiKey = provider.config.api_key || Deno.env.get("RESEND_API_KEY")!;
      const from = provider.from_address || provider.config.from_email || "FixWay <noreply@fixway.fr>";
      return await sendViaResend(apiKey, from, to, subject, html);
    }
    case 'brevo_email': {
      const from = provider.config.from_email || provider.from_address || 'noreply@fixway.fr';
      const fromName = provider.config.from_name || 'FixWay';
      return await sendViaBrevoEmail(provider.config.api_key, from, fromName, to, subject, html);
    }
    case 'smtp': {
      // SMTP not implemented in Deno Edge Functions (no native SMTP client)
      // Fall back to Resend
      console.warn('SMTP provider not yet supported in Edge Functions, falling back to Resend');
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      return await resend.emails.send({ from: "FixWay <noreply@fixway.fr>", to: [to], subject, html });
    }
    default:
      throw new Error(`Provider email inconnu: ${provider.provider}`);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { planName, clientEmail, clientName, message, toEmail } = await req.json();

    // Get active email provider
    const emailProvider = await getActiveEmailProvider(supabaseClient);
    console.log(`📧 Email provider: ${emailProvider?.provider || 'fallback resend'}`);

    const html = `
      <h1>Nouvelle demande de contact</h1>
      <p><strong>Plan demandé:</strong> ${planName}</p>
      ${clientName ? `<p><strong>Nom:</strong> ${clientName}</p>` : ''}
      ${clientEmail ? `<p><strong>Email:</strong> ${clientEmail}</p>` : ''}
      ${message ? `<p><strong>Message:</strong></p><p>${message}</p>` : ''}
      <p>Cette demande a été générée automatiquement depuis la page de tarification.</p>
    `;

    const emailResponse = await sendEmail(emailProvider, toEmail, `Demande de contact pour le plan ${planName}`, html);
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
