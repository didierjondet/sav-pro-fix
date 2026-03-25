import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TWILIO_GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY is not configured')

    const twilioApiKey = Deno.env.get('TWILIO_API_KEY')
    if (!twilioApiKey) throw new Error('TWILIO_API_KEY is not configured')

    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')
    if (!twilioPhoneNumber) throw new Error('TWILIO_PHONE_NUMBER is not configured')

    console.log('[CHECK-SMS-CREDITS] Vérification des crédits SMS programmée')

    // 1. Récupérer les alertes SMS activées
    const { data: alerts, error: alertsError } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('alert_type', 'sms_credits')
      .eq('is_enabled', true)

    if (alertsError) {
      console.error('[CHECK-SMS-CREDITS] Erreur récupération alertes:', alertsError)
      throw alertsError
    }

    if (!alerts || alerts.length === 0) {
      console.log('[CHECK-SMS-CREDITS] Aucune alerte SMS activée')
      return new Response(
        JSON.stringify({ message: 'Aucune alerte SMS activée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[CHECK-SMS-CREDITS] ${alerts.length} alerte(s) SMS trouvée(s)`)

    // 2. Récupérer le solde Twilio via la gateway
    const twilioResponse = await fetch(`${TWILIO_GATEWAY_URL}/Balance.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': twilioApiKey,
      },
    })

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text()
      console.error('[CHECK-SMS-CREDITS] Erreur API Twilio:', errorText)
      throw new Error(`Erreur API Twilio: ${twilioResponse.status}`)
    }

    const twilioData = await twilioResponse.json()
    const currentBalance = parseFloat(twilioData.balance)
    
    // Estimer les crédits SMS (1 SMS ≈ $0.08)
    const estimatedSMSCredits = Math.floor(currentBalance / 0.08)

    console.log(`[CHECK-SMS-CREDITS] Solde Twilio: $${currentBalance} (≈${estimatedSMSCredits} SMS)`)

    // 3. Vérifier chaque alerte
    for (const alert of alerts) {
      const threshold = alert.threshold_value || 100
      const lastAlert = alert.last_alert_sent_at ? new Date(alert.last_alert_sent_at) : null
      const now = new Date()

      const shouldAlert = estimatedSMSCredits <= threshold
      
      // Éviter de spammer - ne pas envoyer plus d'une alerte par jour
      const alertCooldown = 24 * 60 * 60 * 1000
      const canSendAlert = !lastAlert || (now.getTime() - lastAlert.getTime()) > alertCooldown

      console.log(`[CHECK-SMS-CREDITS] Alerte ${alert.id}: seuil=${threshold}, crédits=${estimatedSMSCredits}, shouldAlert=${shouldAlert}, canSendAlert=${canSendAlert}`)

      if (shouldAlert && canSendAlert) {
        let messageTemplate = alert.sms_message_1
        const criticalityRatio = estimatedSMSCredits / threshold

        if (criticalityRatio <= 0.3 && alert.sms_message_3) {
          messageTemplate = alert.sms_message_3
        } else if (criticalityRatio <= 0.6 && alert.sms_message_2) {
          messageTemplate = alert.sms_message_2
        }

        if (!messageTemplate) {
          console.log(`[CHECK-SMS-CREDITS] Aucun message configuré pour l'alerte ${alert.id}`)
          continue
        }

        const finalMessage = messageTemplate
          .replace(/\$\{threshold\}/g, threshold.toString())
          .replace(/\$\{remaining\}/g, estimatedSMSCredits.toString())

        console.log(`[CHECK-SMS-CREDITS] Envoi alerte SMS: "${finalMessage}"`)

        // Envoyer le SMS via la gateway Twilio
        try {
          const smsBody = new URLSearchParams({
            From: twilioPhoneNumber,
            To: twilioPhoneNumber,
            Body: finalMessage,
          })

          const smsResponse = await fetch(`${TWILIO_GATEWAY_URL}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'X-Connection-Api-Key': twilioApiKey,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: smsBody,
          })

          if (smsResponse.ok) {
            const smsData = await smsResponse.json()
            console.log(`[CHECK-SMS-CREDITS] SMS envoyé avec succès: ${smsData.sid}`)

            await supabase
              .from('alert_history')
              .insert({
                alert_id: alert.id,
                message_sent: finalMessage,
                threshold_value: threshold,
                current_value: estimatedSMSCredits,
                phone_number: twilioPhoneNumber,
              })

            await supabase
              .from('system_alerts')
              .update({
                last_alert_sent_at: now.toISOString(),
                last_check_at: now.toISOString(),
              })
              .eq('id', alert.id)

          } else {
            const errorText = await smsResponse.text()
            console.error(`[CHECK-SMS-CREDITS] Erreur envoi SMS:`, errorText)
          }
        } catch (smsError) {
          console.error(`[CHECK-SMS-CREDITS] Erreur lors de l'envoi du SMS:`, smsError)
        }
      } else {
        await supabase
          .from('system_alerts')
          .update({ last_check_at: now.toISOString() })
          .eq('id', alert.id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Vérification des crédits SMS terminée',
        current_balance: currentBalance,
        estimated_sms_credits: estimatedSMSCredits,
        alerts_checked: alerts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[CHECK-SMS-CREDITS] Erreur:', error.message)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Impossible de vérifier les crédits SMS'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
