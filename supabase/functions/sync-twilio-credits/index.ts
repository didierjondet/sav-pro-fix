import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Créer le client Supabase avec la clé de service
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les clés Twilio depuis les secrets
    const accountSid = Deno.env.get('ACCOUNT_SID');
    const authToken = Deno.env.get('AUTH_TOKEN');

    if (!accountSid || !authToken) {
      throw new Error('Configuration Twilio manquante');
    }

    console.log('[SYNC-TWILIO] Début de la synchronisation');

    // Récupérer le solde Twilio
    const auth = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur API Twilio: ${response.status}`);
    }

    const twilioData = await response.json();
    const twilioBalance = parseFloat(twilioData.balance);
    
    console.log('[SYNC-TWILIO] Solde Twilio récupéré:', twilioBalance);

    // Convertir le solde USD en crédits SMS (approximatif: 1 USD = 100 SMS)
    const totalSmsCredits = Math.floor(twilioBalance * 100);

    // Récupérer tous les magasins actifs
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, name, sms_credits_allocated, sms_credits_used, subscription_tier')
      .neq('subscription_tier', 'inactive');

    if (shopsError) {
      throw new Error(`Erreur lors de la récupération des magasins: ${shopsError.message}`);
    }

    console.log('[SYNC-TWILIO] Magasins trouvés:', shops?.length);

    // Calculer la distribution des crédits selon les plans
    let totalAllocated = 0;
    const allocations: Array<{id: string, allocated: number}> = [];

    for (const shop of shops || []) {
      let allocation = 0;
      
      switch (shop.subscription_tier) {
        case 'free':
          allocation = Math.min(15, totalSmsCredits * 0.1); // 10% max, limité à 15
          break;
        case 'premium':
          allocation = Math.min(100, totalSmsCredits * 0.2); // 20% max, limité à 100
          break;
        case 'enterprise':
          allocation = Math.min(400, totalSmsCredits * 0.4); // 40% max, limité à 400
          break;
        default:
          allocation = 15;
      }

      allocations.push({ id: shop.id, allocated: Math.floor(allocation) });
      totalAllocated += Math.floor(allocation);
    }

    // Mettre à jour les allocations dans la base de données
    const updatePromises = allocations.map(({ id, allocated }) => 
      supabase
        .from('shops')
        .update({ sms_credits_allocated: allocated })
        .eq('id', id)
    );

    await Promise.all(updatePromises);

    // Mettre à jour ou créer l'entrée des crédits globaux
    const { error: globalError } = await supabase
      .from('global_sms_credits')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001', // ID fixe pour l'enregistrement global
        total_credits: totalSmsCredits,
        used_credits: totalAllocated,
        twilio_balance_usd: twilioBalance,
        last_sync_at: new Date().toISOString(),
        sync_status: 'success',
        updated_at: new Date().toISOString()
      });

    if (globalError) {
      console.error('[SYNC-TWILIO] Erreur mise à jour globale:', globalError);
    }

    const syncResult = {
      success: true,
      twilio_balance_usd: twilioBalance,
      total_sms_credits: totalSmsCredits,
      allocated_credits: totalAllocated,
      remaining_credits: totalSmsCredits - totalAllocated,
      shops_updated: allocations.length,
      allocations: allocations
    };

    console.log('[SYNC-TWILIO] Synchronisation terminée:', syncResult);

    return new Response(
      JSON.stringify(syncResult),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[SYNC-TWILIO] Erreur:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Impossible de synchroniser les crédits'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})