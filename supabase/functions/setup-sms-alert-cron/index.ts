import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('[SETUP-SMS-ALERT-CRON] Configuration de la tâche cron pour les alertes SMS')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Configuration du cron job pour vérifier les crédits SMS toutes les heures
    const cronQuery = `
      SELECT cron.schedule(
        'check-sms-credits-hourly',
        '0 * * * *', -- Toutes les heures à la minute 0
        $$
        SELECT
          net.http_post(
            url:='${supabaseUrl}/functions/v1/check-sms-credits',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}"}'::jsonb,
            body:=concat('{"triggered_at": "', now(), '"}')::jsonb
          ) as request_id;
        $$
      );
    `

    // Exécuter la configuration du cron
    const { data, error } = await supabase.rpc('execute_sql', {
      query: cronQuery
    })

    if (error) {
      console.error('[SETUP-SMS-ALERT-CRON] Erreur lors de la configuration du cron:', error)
      throw error
    }

    console.log('[SETUP-SMS-ALERT-CRON] Tâche cron configurée avec succès')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tâche cron pour les alertes SMS configurée avec succès',
        cron_name: 'check-sms-credits-hourly',
        schedule: '0 * * * * (toutes les heures)',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[SETUP-SMS-ALERT-CRON] Erreur:', error.message)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Impossible de configurer la tâche cron pour les alertes SMS'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})