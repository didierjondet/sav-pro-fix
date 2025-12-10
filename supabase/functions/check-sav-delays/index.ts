import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SAVCase {
  id: string;
  case_number: string;
  sav_type: string;
  status: string;
  created_at: string;
  shop_id: string;
}

interface ShopSAVType {
  type_key: string;
  max_processing_days: number;
  alert_days: number;
}

interface ShopSAVStatus {
  status_key: string;
  status_label: string;
  pause_timer: boolean;
  is_final_status: boolean;
}

interface DelayInfo {
  isOverdue: boolean;
  remainingDays: number;
  isPaused: boolean;
}

// Fonction pour calculer le délai d'un SAV (similaire à calculateSAVDelay)
function calculateSAVDelay(
  savCase: SAVCase, 
  savTypes: ShopSAVType[], 
  savStatuses: ShopSAVStatus[]
): DelayInfo {
  const savType = savTypes.find(t => t.type_key === savCase.sav_type);
  const currentStatus = savStatuses.find(s => s.status_key === savCase.status);
  
  // Utiliser is_final_status pour déterminer si le SAV est clôturé
  const isFinal = currentStatus?.is_final_status || false;
  const isPaused = currentStatus?.pause_timer || isFinal;
  const maxDays = savType?.max_processing_days || 7;
  
  const createdAt = new Date(savCase.created_at);
  const now = new Date();
  const elapsedDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  const remainingDays = maxDays - elapsedDays;
  const isOverdue = remainingDays < 0 && !isPaused && !isFinal;
  
  return {
    isOverdue,
    remainingDays,
    isPaused
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 [CHECK-SAV-DELAYS] Starting SAV delay alerts check');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer tous les shops avec les alertes de retard activées
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, name, sav_delay_alerts_enabled')
      .eq('sav_delay_alerts_enabled', true);

    if (shopsError) {
      console.error('❌ [CHECK-SAV-DELAYS] Error fetching shops:', shopsError);
      throw shopsError;
    }

    if (!shops || shops.length === 0) {
      console.log('ℹ️ [CHECK-SAV-DELAYS] No shops with delay alerts enabled');
      return new Response(
        JSON.stringify({ success: true, message: 'No shops with alerts enabled', alertsCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 [CHECK-SAV-DELAYS] Found ${shops.length} shop(s) with alerts enabled`);

    let totalAlertsCreated = 0;
    const today = new Date().toISOString().split('T')[0];

    // 2. Pour chaque shop, vérifier les SAV
    for (const shop of shops) {
      console.log(`🔍 [CHECK-SAV-DELAYS] Checking shop: ${shop.name} (${shop.id})`);

      // Récupérer les types SAV du shop
      const { data: savTypes, error: typesError } = await supabase
        .from('shop_sav_types')
        .select('type_key, max_processing_days, alert_days')
        .eq('shop_id', shop.id)
        .eq('is_active', true);

      if (typesError || !savTypes) {
        console.error(`❌ [CHECK-SAV-DELAYS] Error fetching SAV types for shop ${shop.id}:`, typesError);
        continue;
      }

      // Récupérer TOUS les statuts SAV du shop avec is_final_status
      const { data: savStatuses, error: statusesError } = await supabase
        .from('shop_sav_statuses')
        .select('status_key, status_label, pause_timer, is_final_status')
        .eq('shop_id', shop.id)
        .eq('is_active', true);

      if (statusesError || !savStatuses) {
        console.error(`❌ [CHECK-SAV-DELAYS] Error fetching SAV statuses for shop ${shop.id}:`, statusesError);
        continue;
      }

      // Identifier les statuts finaux en utilisant le champ is_final_status
      const finalStatuses = savStatuses
        .filter(s => s.is_final_status)
        .map(s => s.status_key);

      // Construire la liste d'exclusion (statuts finaux + fallback defaults)
      const excludedStatuses = [
        ...finalStatuses,
        'delivered', // Fallback pour les anciens statuts par défaut
        'cancelled',
        'ready'
      ];

      // Dédupliquer
      const uniqueExcludedStatuses = [...new Set(excludedStatuses)];

      console.log(`📋 [CHECK-SAV-DELAYS] Shop ${shop.name}:`);
      console.log(`   - Final statuses (is_final_status=true): ${finalStatuses.length > 0 ? finalStatuses.join(', ') : 'none'}`);
      console.log(`   - Total excluded statuses: ${uniqueExcludedStatuses.join(', ')}`);

      // Récupérer les SAV actifs (en excluant tous les statuts finaux)
      const { data: savCases, error: casesError } = await supabase
        .from('sav_cases')
        .select('id, case_number, sav_type, status, created_at, shop_id')
        .eq('shop_id', shop.id)
        .not('status', 'in', `(${uniqueExcludedStatuses.join(',')})`);

      if (casesError || !savCases) {
        console.error(`❌ [CHECK-SAV-DELAYS] Error fetching SAV cases for shop ${shop.id}:`, casesError);
        continue;
      }

      console.log(`📋 [CHECK-SAV-DELAYS] Found ${savCases.length} active SAV(s) for shop ${shop.name}`);

      // 3. Pour chaque SAV, calculer le délai et créer une alerte si nécessaire
      for (const savCase of savCases) {
        const delayInfo = calculateSAVDelay(savCase, savTypes as ShopSAVType[], savStatuses as ShopSAVStatus[]);
        
        // Récupérer le nombre de jours avant alerte pour ce type de SAV
        const savType = savTypes.find(t => t.type_key === savCase.sav_type);
        const alertDays = savType?.alert_days ?? 2;

        // Arrondir les jours restants pour la comparaison
        const daysRemainingRounded = Math.ceil(delayInfo.remainingDays);

        console.log(`📊 [CHECK-SAV-DELAYS] SAV ${savCase.case_number} - Type: ${savCase.sav_type} - Remaining: ${delayInfo.remainingDays.toFixed(2)}d (rounded: ${daysRemainingRounded}d) - Alert threshold: ${alertDays}d - Paused: ${delayInfo.isPaused} - Overdue: ${delayInfo.isOverdue}`);

        // Ignorer les SAV en pause
        if (delayInfo.isPaused) {
          console.log(`⏸️ [CHECK-SAV-DELAYS] SAV ${savCase.case_number} is paused, skipping alert`);
          continue;
        }

        // Vérifier si on doit créer une alerte (pour les SAV approchant la limite OU déjà en retard)
        const shouldAlert = delayInfo.isOverdue || (daysRemainingRounded <= alertDays && daysRemainingRounded >= 0);
        
        if (shouldAlert) {
          // Vérifier qu'une alerte similaire n'existe pas déjà aujourd'hui
          const { data: existingAlerts } = await supabase
            .from('notifications')
            .select('id')
            .eq('sav_case_id', savCase.id)
            .eq('type', 'sav_delay_alert')
            .eq('read', false)
            .gte('created_at', `${today}T00:00:00.000Z`);

          if (existingAlerts && existingAlerts.length > 0) {
            console.log(`ℹ️ [CHECK-SAV-DELAYS] Alert already exists for SAV ${savCase.case_number}`);
            continue;
          }

          // Créer l'alerte
          let title, message;
          if (delayInfo.isOverdue) {
            const daysOverdue = Math.abs(daysRemainingRounded);
            title = 'SAV en retard !';
            message = `🚨 Le SAV ${savCase.case_number} (${savCase.sav_type}) est en retard de ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''} !`;
          } else if (daysRemainingRounded === 0) {
            title = 'SAV en retard imminent !';
            message = `⚠️ Le SAV ${savCase.case_number} (${savCase.sav_type}) sera en retard dans moins de 24h !`;
          } else {
            title = 'SAV proche de la limite';
            message = `⏰ Le SAV ${savCase.case_number} (${savCase.sav_type}) sera en retard dans ${daysRemainingRounded} jour${daysRemainingRounded > 1 ? 's' : ''}`;
          }

          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              shop_id: shop.id,
              type: 'sav_delay_alert',
              title,
              message,
              read: false,
              sav_case_id: savCase.id
            });

          if (notifError) {
            console.error(`❌ [CHECK-SAV-DELAYS] Error creating notification for SAV ${savCase.case_number}:`, notifError);
          } else {
            console.log(`✅ [CHECK-SAV-DELAYS] Alert created for SAV ${savCase.case_number} - ${delayInfo.isOverdue ? `overdue by ${Math.abs(daysRemainingRounded)}d` : `${daysRemainingRounded}d remaining`}`);
            totalAlertsCreated++;
          }
        }
      }
    }

    console.log(`🎉 [CHECK-SAV-DELAYS] Check completed - ${totalAlertsCreated} alert(s) created`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SAV delay alerts check completed',
        shopsChecked: shops.length,
        alertsCreated: totalAlertsCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [CHECK-SAV-DELAYS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
