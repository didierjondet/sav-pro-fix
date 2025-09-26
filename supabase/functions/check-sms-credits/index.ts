import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const accountSid = Deno.env.get('ACCOUNT_SID')
    const authToken = Deno.env.get('AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    console.log('[CHECK-SMS-CREDITS] Vérification des crédits SMS programmée')

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      throw new Error('Configuration Twilio manquante')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // 2. Récupérer le solde Twilio
    const auth = btoa(`${accountSid}:${authToken}`)
    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text()
      console.error('[CHECK-SMS-CREDITS] Erreur API Twilio:', errorText)
      throw new Error(`Erreur API Twilio: ${twilioResponse.status}`)
    }

    const twilioData = await twilioResponse.json()
    const currentBalance = parseFloat(twilioData.balance)
    
    // Estimer les crédits SMS (1 SMS ≈ $0.0075)
    const estimatedSMSCredits = Math.floor(currentBalance / 0.0075)

    console.log(`[CHECK-SMS-CREDITS] Solde Twilio: $${currentBalance} (≈${estimatedSMSCredits} SMS)`)

    // 3. Vérifier chaque alerte
    for (const alert of alerts) {
      const threshold = alert.threshold_value || 100
      const lastCheck = alert.last_check_at ? new Date(alert.last_check_at) : null
      const lastAlert = alert.last_alert_sent_at ? new Date(alert.last_alert_sent_at) : null
      const now = new Date()

      // Vérifier si on doit envoyer une alerte
      const shouldAlert = estimatedSMSCredits <= threshold
      
      // Éviter de spammer - ne pas envoyer plus d'une alerte par jour
      const alertCooldown = 24 * 60 * 60 * 1000 // 24 heures
      const canSendAlert = !lastAlert || (now.getTime() - lastAlert.getTime()) > alertCooldown

      console.log(`[CHECK-SMS-CREDITS] Alerte ${alert.id}: seuil=${threshold}, crédits=${estimatedSMSCredits}, shouldAlert=${shouldAlert}, canSendAlert=${canSendAlert}`)

      if (shouldAlert && canSendAlert) {
        // Déterminer quel message utiliser selon la criticité
        let messageTemplate = alert.sms_message_1
        const criticalityRatio = estimatedSMSCredits / threshold

        if (criticalityRatio <= 0.3 && alert.sms_message_3) {
          messageTemplate = alert.sms_message_3 // Critique
        } else if (criticalityRatio <= 0.6 && alert.sms_message_2) {
          messageTemplate = alert.sms_message_2 // Urgent
        }

        if (!messageTemplate) {
          console.log(`[CHECK-SMS-CREDITS] Aucun message configuré pour l'alerte ${alert.id}`)
          continue
        }

        // Remplacer les variables dans le message
        const finalMessage = messageTemplate
          .replace(/\$\{threshold\}/g, threshold.toString())
          .replace(/\$\{remaining\}/g, estimatedSMSCredits.toString())

        console.log(`[CHECK-SMS-CREDITS] Envoi alerte SMS: "${finalMessage}"`)

        // Envoyer le SMS via Twilio
        try {
          const smsBody = new URLSearchParams({
            From: twilioPhoneNumber,
            To: twilioPhoneNumber, // Pour l'instant, envoyer à soi-même
            Body: finalMessage,
          })

          const smsResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: smsBody,
          })

          if (smsResponse.ok) {
            const smsData = await smsResponse.json()
            console.log(`[CHECK-SMS-CREDITS] SMS envoyé avec succès: ${smsData.sid}`)

            // Enregistrer l'envoi dans l'historique
            await supabase
              .from('alert_history')
              .insert({
                alert_id: alert.id,
                message_sent: finalMessage,
                threshold_value: threshold,
                current_value: estimatedSMSCredits,
                phone_number: twilioPhoneNumber,
              })

            // Mettre à jour la dernière alerte envoyée
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
        // Mettre à jour seulement la dernière vérification
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