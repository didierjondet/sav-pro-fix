import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const TWILIO_GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

// === AES-GCM Decryption (same key derivation as save-messaging-provider) ===
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

interface SMSRequest {
  shopId: string;
  toNumber: string;
  message: string;
  type: 'sav_notification' | 'quote_notification' | 'manual' | 'status_change' | 'review_request' | 'appointment_proposal' | 'satisfaction';
  recordId?: string;
}

function formatPhoneNumber(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) return '+33' + cleaned.substring(1);
  if (cleaned.startsWith('+33') && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith('33') && cleaned.length === 11) return '+' + cleaned;
  return cleaned;
}

// === Provider adapters ===

async function sendViaTwilioGateway(formattedNumber: string, message: string): Promise<{ success: boolean; sid?: string; error?: string; status?: number }> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!lovableApiKey || !twilioApiKey) throw new Error('Configuration Twilio Gateway manquante (LOVABLE_API_KEY ou TWILIO_API_KEY)');
  if (!twilioPhoneNumber) throw new Error('Numéro Twilio manquant (TWILIO_PHONE_NUMBER)');

  const response = await fetch(`${TWILIO_GATEWAY_URL}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': twilioApiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: twilioPhoneNumber, To: formattedNumber, Body: message }),
  });

  const data = await response.json();
  if (response.ok) return { success: true, sid: data.sid };
  return { success: false, error: data.message || 'Erreur Twilio Gateway', status: response.status };
}

async function sendViaTwilioDirect(config: Record<string, string>, formattedNumber: string, message: string): Promise<{ success: boolean; sid?: string; error?: string; status?: number }> {
  const { account_sid, auth_token, phone_number } = config;
  if (!account_sid || !auth_token || !phone_number) throw new Error('Configuration Twilio Direct incomplète');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${account_sid}:${auth_token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: phone_number, To: formattedNumber, Body: message }),
  });

  const data = await response.json();
  if (response.ok) return { success: true, sid: data.sid };
  return { success: false, error: data.message || 'Erreur Twilio Direct', status: response.status };
}

async function sendViaBrevoSMS(config: Record<string, string>, formattedNumber: string, message: string): Promise<{ success: boolean; sid?: string; error?: string; status?: number }> {
  const { api_key, sender_name } = config;
  if (!api_key) throw new Error('Clé API Brevo manquante');

  const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: {
      'api-key': api_key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'transactional',
      sender: sender_name || 'SAVPro',
      recipient: formattedNumber,
      content: message,
    }),
  });

  const data = await response.json();
  if (response.ok) return { success: true, sid: data.messageId || data.reference || 'brevo-ok' };
  return { success: false, error: data.message || JSON.stringify(data), status: response.status };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const requestData: SMSRequest = await req.json();
    const { shopId, toNumber, message, type, recordId } = requestData;

    if (!shopId || !toNumber || !message) throw new Error('Paramètres requis manquants');

    // Reset monthly counters if needed
    try {
      const { error: rpcError } = await supabase.rpc('reset_monthly_counters');
      if (rpcError) console.warn('⚠️ reset_monthly_counters error (non-fatal):', rpcError.message);
    } catch (e) {
      console.warn('⚠️ reset_monthly_counters exception (non-fatal):', e);
    }

    // Get shop
    const { data: shop, error: shopError } = await supabase.from('shops').select('*').eq('id', shopId).single();
    if (shopError || !shop) throw new Error('Shop non trouvé');

    const formattedNumber = formatPhoneNumber(toNumber);
    console.log(`📱 SMS to ${formattedNumber} via multi-provider routing`);

    // === Determine active SMS provider ===
    const { data: activeProvider } = await supabase
      .from('messaging_providers')
      .select('*')
      .eq('type', 'sms')
      .eq('is_active', true)
      .maybeSingle();

    let result: { success: boolean; sid?: string; error?: string; status?: number };

    if (!activeProvider) {
      // Fallback: use Twilio Gateway (backward compatible)
      console.log('📡 Aucun provider SMS actif, fallback Twilio Gateway');
      result = await sendViaTwilioGateway(formattedNumber, message);
    } else {
      console.log(`📡 Provider SMS actif: ${activeProvider.provider} (${activeProvider.name})`);

      let config: Record<string, string> = {};
      if (activeProvider.encrypted_config?.data) {
        try {
          config = await decryptConfig(activeProvider.encrypted_config.data);
        } catch (e) {
          console.error('❌ Échec déchiffrement config:', e);
          throw new Error(`Impossible de déchiffrer la configuration du fournisseur ${activeProvider.name}`);
        }
      }

      switch (activeProvider.provider) {
        case 'twilio_gateway':
          result = await sendViaTwilioGateway(formattedNumber, message);
          break;
        case 'twilio_direct':
          result = await sendViaTwilioDirect(config, formattedNumber, message);
          break;
        case 'brevo_sms':
          result = await sendViaBrevoSMS(config, formattedNumber, message);
          break;
        default:
          throw new Error(`Provider SMS inconnu: ${activeProvider.provider}`);
      }
    }

    if (result.success) {
      console.log('✅ SMS envoyé, sid:', result.sid);

      // Credit deduction logic (unchanged)
      const currentMonthlyUsed = shop.monthly_sms_used || 0;
      const monthlyLimit = shop.sms_credits_allocated || 0;
      const currentPurchasedUsed = shop.purchased_sms_credits || 0;
      const updateData: any = {};
      if (currentMonthlyUsed < monthlyLimit) {
        updateData.monthly_sms_used = currentMonthlyUsed + 1;
      } else {
        updateData.purchased_sms_credits = currentPurchasedUsed + 1;
      }
      await supabase.from('shops').update(updateData).eq('id', shopId);

      // SMS history
      await supabase.from('sms_history').insert({
        shop_id: shopId, type, message, to_number: formattedNumber,
        status: 'sent', twilio_sid: result.sid || null, record_id: recordId || null,
      });

      // Integrate into SAV discussion if applicable
      if (recordId && ['sav_notification', 'status_change', 'manual', 'review_request'].includes(type)) {
        const { data: savCase } = await supabase.from('sav_cases').select('id').eq('id', recordId).single();
        if (savCase) {
          const maskedNumber = formattedNumber.slice(0, 8) + '***' + formattedNumber.slice(-2);
          const prefix = type === 'review_request' ? '⭐ Demande d\'avis envoyée au' : '📱 SMS envoyé au';
          await supabase.from('sav_messages').insert({
            sav_case_id: recordId, shop_id: shopId, sender_type: 'shop',
            sender_name: type === 'review_request' ? `⭐ Demande d'avis - ${shop.name}` : `📱 SMS - ${shop.name}`,
            message: `${prefix} ${maskedNumber}\n\n"${message}"\n\n✅ Message ID: ${result.sid}`,
            read_by_shop: true, read_by_client: false,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, sid: result.sid, message: 'SMS envoyé avec succès' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('❌ Échec envoi SMS:', result.error);
      await supabase.from('sms_history').insert({
        shop_id: shopId, type, message, to_number: formattedNumber,
        status: 'failed', error_message: result.error, record_id: recordId || null,
      });

      return new Response(JSON.stringify({ success: false, error: result.error }), {
        status: result.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('💥 ERREUR SEND-SMS:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
