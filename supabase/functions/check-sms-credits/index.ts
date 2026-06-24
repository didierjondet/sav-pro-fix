import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// === AES-GCM Decryption (même dérivation que send-sms / brevo-sms-balance) ===
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
    keyMaterial,
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
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(decrypted))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('[CHECK-SMS-CREDITS] Démarrage vérification (balance projetée)')

    // 1. Alertes activées
    const { data: alerts, error: alertsError } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('alert_type', 'sms_credits')
      .eq('is_enabled', true)

    if (alertsError) throw alertsError

    if (!alerts || alerts.length === 0) {
      console.log('[CHECK-SMS-CREDITS] Aucune alerte SMS activée')
      return new Response(JSON.stringify({ message: 'Aucune alerte SMS activée' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Config seuil + numéro destinataire
    const { data: alertCfg } = await supabase
      .from('twilio_alert_config')
      .select('threshold_sms, alert_phone')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle()

    const configuredThreshold = alertCfg?.threshold_sms || null
    const alertPhone = alertCfg?.alert_phone?.trim() || null

    if (!alertPhone) {
      console.log('[CHECK-SMS-CREDITS] Aucun numéro d\'alerte configuré, abandon')
      return new Response(JSON.stringify({ message: 'Aucun numéro d\'alerte configuré' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Provider Brevo SMS actif (clé API)
    const { data: providers, error: provErr } = await supabase
      .from('messaging_providers')
      .select('id, provider, encrypted_config')
      .eq('type', 'sms')
      .eq('provider', 'brevo_sms')
      .eq('is_active', true)
      .limit(1)

    if (provErr) throw provErr
    if (!providers || providers.length === 0) {
      console.error('[CHECK-SMS-CREDITS] Aucun provider Brevo SMS actif')
      return new Response(JSON.stringify({ error: 'Aucun provider Brevo SMS actif' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const encData = (providers[0] as any).encrypted_config?.data
    if (!encData) throw new Error('Configuration Brevo absente ou non chiffrée')
    const brevoConfig = await decryptConfig(encData)
    const brevoApiKey = brevoConfig.api_key
    if (!brevoApiKey) throw new Error('Clé API Brevo introuvable')
    const senderName = (brevoConfig.sender_name || 'Fixway').slice(0, 11)

    // 4. Solde Brevo
    const brevoResp = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: { 'api-key': brevoApiKey, Accept: 'application/json' },
    })
    const brevoData = await brevoResp.json()
    if (!brevoResp.ok) {
      throw new Error(`Brevo API ${brevoResp.status}: ${brevoData.message || JSON.stringify(brevoData)}`)
    }
    const plans = Array.isArray(brevoData.plan) ? brevoData.plan : []
    const smsPlan = plans.find((p: any) =>
      p.type === 'sms' ||
      p.type === 'sms_credits' ||
      (p.credits && p.creditsType === 'sendLimit' && p.type?.toLowerCase?.().includes('sms'))
    )
    const brevoBalance = Math.floor(Number(smsPlan?.credits ?? 0))

    // MAJ pot global
    await supabase
      .from('global_sms_credits')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        total_credits: brevoBalance,
        sync_status: 'ok',
        last_sync_at: new Date().toISOString(),
        twilio_balance_usd: 0,
      }, { onConflict: 'id' })

    // 5. Calcul balance projetée
    const { data: shopsList, error: shopsErr } = await supabase
      .from('shops')
      .select('id, sms_credits_allocated, monthly_sms_used, admin_added_sms_credits, purchased_sms_credits')

    if (shopsErr) throw shopsErr

    let allocated = 0
    let remaining = 0
    for (const s of shopsList || []) {
      const monthly_allocated = (s as any).sms_credits_allocated || 0
      const monthly_used = (s as any).monthly_sms_used || 0
      const admin_added = (s as any).admin_added_sms_credits || 0
      const purchasable_used = (s as any).purchased_sms_credits || 0

      // Achats complétés
      const { data: pkgs } = await supabase
        .from('sms_package_purchases')
        .select('sms_count')
        .eq('shop_id', (s as any).id)
        .eq('status', 'completed')
      const purchased_total = (pkgs || []).reduce((sum, p: any) => sum + (p.sms_count || 0), 0)

      const monthly_remaining = Math.max(0, monthly_allocated - monthly_used)
      const purchasable_total = purchased_total + admin_added
      const purchasable_remaining = Math.max(0, purchasable_total - purchasable_used)

      allocated += monthly_allocated + purchasable_total
      remaining += monthly_remaining + purchasable_remaining
    }

    const projected = brevoBalance - (allocated - remaining)
    console.log(`[CHECK-SMS-CREDITS] Brevo=${brevoBalance} | alloué=${allocated} | restant=${remaining} | projeté=${projected}`)

    // 6. Vérifier chaque alerte
    for (const alert of alerts) {
      const threshold = configuredThreshold ?? alert.threshold_value ?? 100
      const lastAlert = alert.last_alert_sent_at ? new Date(alert.last_alert_sent_at) : null
      const now = new Date()

      const shouldAlert = projected <= threshold
      const alertCooldown = 24 * 60 * 60 * 1000
      const canSendAlert = !lastAlert || (now.getTime() - lastAlert.getTime()) > alertCooldown

      console.log(`[CHECK-SMS-CREDITS] Alerte ${alert.id}: seuil=${threshold}, projeté=${projected}, shouldAlert=${shouldAlert}, canSend=${canSendAlert}`)

      if (shouldAlert && canSendAlert) {
        let messageTemplate = alert.sms_message_1
        const criticalityRatio = threshold > 0 ? projected / threshold : 0
        if (criticalityRatio <= 0.3 && alert.sms_message_3) messageTemplate = alert.sms_message_3
        else if (criticalityRatio <= 0.6 && alert.sms_message_2) messageTemplate = alert.sms_message_2

        if (!messageTemplate) {
          console.log(`[CHECK-SMS-CREDITS] Aucun message configuré pour ${alert.id}`)
          continue
        }

        const finalMessage = String(messageTemplate)
          .replace(/\$\{threshold\}/g, String(threshold))
          .replace(/\$\{remaining\}/g, String(projected))

        // Envoi via Brevo Transactional SMS
        try {
          const smsResp = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
            method: 'POST',
            headers: {
              'api-key': brevoApiKey,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              sender: senderName,
              recipient: alertPhone,
              content: finalMessage,
              type: 'transactional',
            }),
          })

          if (smsResp.ok) {
            const smsData = await smsResp.json().catch(() => ({}))
            console.log(`[CHECK-SMS-CREDITS] SMS Brevo envoyé: ${smsData.messageId || 'ok'}`)

            await supabase.from('alert_history').insert({
              alert_id: alert.id,
              message_sent: finalMessage,
              threshold_value: threshold,
              current_value: projected,
              phone_number: alertPhone,
            })

            await supabase
              .from('system_alerts')
              .update({ last_alert_sent_at: now.toISOString(), last_check_at: now.toISOString() })
              .eq('id', alert.id)
          } else {
            const errorText = await smsResp.text()
            console.error('[CHECK-SMS-CREDITS] Erreur Brevo SMS:', smsResp.status, errorText)
          }
        } catch (smsError) {
          console.error('[CHECK-SMS-CREDITS] Exception envoi SMS:', smsError)
        }
      } else {
        await supabase
          .from('system_alerts')
          .update({ last_check_at: now.toISOString() })
          .eq('id', alert.id)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      brevo_balance: brevoBalance,
      allocated,
      remaining,
      projected_balance: projected,
      alerts_checked: alerts.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('[CHECK-SMS-CREDITS] Erreur:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
