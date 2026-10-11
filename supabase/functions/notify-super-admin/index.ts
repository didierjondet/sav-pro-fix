import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// === AES-GCM Decryption (même dérivation que check-sms-credits / send-sms) ===
async function getDecryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-fallback-key-change-me'
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode('messaging-config-salt'), iterations: 100000, hash: 'SHA-256' },
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
}

async function decryptConfig(encryptedData: string): Promise<Record<string, string>> {
  const key = await getDecryptionKey()
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, key, ciphertext })
  return JSON.parse(new TextDecoder().decode(decrypted))
}

type Body =
  | { kind: 'new_shop'; shop_name: string; owner_name?: string; owner_email?: string; owner_phone?: string }
  | { kind: 'human_request'; contact_name: string; contact_phone: string; reason: string; shop_name?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = (await req.json()) as Body
    if (!body || (body.kind !== 'new_shop' && body.kind !== 'human_request')) {
      return new Response(JSON.stringify({ error: 'kind invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Numéro d'alerte Super Admin (même champ que les alertes crédits SMS)
    const { data: alertCfg } = await supabase
      .from('twilio_alert_config')
      .select('alert_phone')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle()

    const alertPhone = alertCfg?.alert_phone?.trim()
    if (!alertPhone) {
      console.log('[NOTIFY-SUPER-ADMIN] Aucun numéro d\'alerte configuré')
      return new Response(JSON.stringify({ sent: false, reason: 'no_alert_phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Provider Brevo SMS actif
    const { data: providers } = await supabase
      .from('messaging_providers')
      .select('id, provider, encrypted_config')
      .eq('type', 'sms')
      .eq('provider', 'brevo_sms')
      .eq('is_active', true)
      .limit(1)

    const encData = (providers?.[0] as any)?.encrypted_config?.data
    if (!encData) {
      console.error('[NOTIFY-SUPER-ADMIN] Config Brevo absente')
      return new Response(JSON.stringify({ sent: false, reason: 'no_brevo_config' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const brevoConfig = await decryptConfig(encData)
    const brevoApiKey = brevoConfig.api_key
    if (!brevoApiKey) throw new Error('Clé API Brevo introuvable')
    const senderName = (brevoConfig.sender_name || 'Fixway').slice(0, 11)

    // 3. Message
    let message: string
    if (body.kind === 'new_shop') {
      message = `FIXWAY - Nouveau magasin inscrit : ${body.shop_name || '?'}.`
        + (body.owner_name ? ` Contact : ${body.owner_name}.` : '')
        + (body.owner_email ? ` Email : ${body.owner_email}.` : '')
        + (body.owner_phone ? ` Tel : ${body.owner_phone}.` : '')
    } else {
      if (!body.contact_phone || !body.contact_name) {
        return new Response(JSON.stringify({ error: 'contact_name et contact_phone requis' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      message = `FIXWAY - Demande de rappel via Fixy : ${body.contact_name}, tel ${body.contact_phone}.`
        + (body.shop_name ? ` Magasin : ${body.shop_name}.` : '')
        + ` Motif : ${(body.reason || 'non précisé').slice(0, 200)}`
    }

    // 4. Envoi Brevo Transactional SMS
    const smsResp = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: { 'api-key': brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: senderName, recipient: alertPhone, content: message, type: 'transactional' }),
    })

    if (!smsResp.ok) {
      const errorText = await smsResp.text()
      console.error('[NOTIFY-SUPER-ADMIN] Erreur Brevo SMS:', smsResp.status, errorText)
      return new Response(JSON.stringify({ sent: false, reason: 'brevo_error', status: smsResp.status }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[NOTIFY-SUPER-ADMIN] SMS envoyé (${body.kind})`)
    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[NOTIFY-SUPER-ADMIN] Erreur:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
