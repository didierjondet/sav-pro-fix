import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAIConfig(supabaseClient: any) {
  try {
    const { data } = await supabaseClient
      .from("ai_engine_config")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (!data || data.provider === "lovable") {
      return {
        url: "https://ai.gateway.lovable.dev/v1/chat/completions",
        apiKey: Deno.env.get("LOVABLE_API_KEY"),
        model: data?.model || "google/gemini-2.5-flash",
      };
    }

    const apiKey = Deno.env.get(data.api_key_name);
    if (!apiKey) {
      return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY"), model: "google/gemini-2.5-flash" };
    }

    switch (data.provider) {
      case "openai": return { url: "https://api.openai.com/v1/chat/completions", apiKey, model: data.model };
      case "gemini": return { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", apiKey, model: data.model };
      default: return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY"), model: data.model };
    }
  } catch (e) {
    return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY"), model: "google/gemini-2.5-flash" };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 [DAILY-ASSISTANT] Fonction démarrée');

  try {
    const authHeader = req.headers.get('Authorization')!;
    console.log('🔐 [DAILY-ASSISTANT] Authorization header présent:', !!authHeader);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get AI config
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    const aiConfig = await getAIConfig(serviceClient);

    if (!aiConfig.apiKey) {
      return new Response(
        JSON.stringify({ error: 'Clé API IA non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user's shop_id
    console.log('👤 [DAILY-ASSISTANT] Récupération de l\'utilisateur...');
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.error('❌ [DAILY-ASSISTANT] Utilisateur non authentifié');
      throw new Error('Non authentifié');
    }
    console.log('✅ [DAILY-ASSISTANT] Utilisateur:', user.id);

    console.log('🏪 [DAILY-ASSISTANT] Récupération du profil...');
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.shop_id) {
      console.error('❌ [DAILY-ASSISTANT] Boutique introuvable pour l\'utilisateur');
      throw new Error('Boutique introuvable');
    }
    console.log('✅ [DAILY-ASSISTANT] Shop ID:', profile.shop_id);

    // 🆕 Fetch configuration
    console.log('⚙️ [DAILY-ASSISTANT] Récupération de la configuration...');
    const { data: config } = await supabaseClient
      .from('daily_assistant_config')
      .select('*')
      .eq('shop_id', profile.shop_id)
      .maybeSingle();

    // Default config if none exists
    const effectiveConfig = config || {
      sav_statuses_included: ['pending', 'in_progress', 'parts_ordered', 'testing'],
      sav_types_included: null,
      min_sav_age_days: 0,
      late_threshold_days: 3,
      low_stock_threshold: 5,
      analysis_priority: 'balanced',
      tone: 'professional',
      sections_enabled: {
        daily_priorities: true,
        quick_actions: true,
        parts_management: true,
        productivity_tips: true,
        revenue_optimization: true
      },
      top_items_count: 5
    };

    console.log('✅ [DAILY-ASSISTANT] Configuration:', effectiveConfig);

    // Fetch relevant data with filters
    console.log('📊 [DAILY-ASSISTANT] Récupération des données...');
    
    // Build SAV query with filters
    let savQuery = supabaseClient
      .from('sav_cases')
      .select(`
        *,
        customer:customers(first_name, last_name),
        sav_parts(*, part:parts(*))
      `)
      .eq('shop_id', profile.shop_id)
      .in('status', effectiveConfig.sav_statuses_included);

    // Apply SAV type filter if specified
    if (effectiveConfig.sav_types_included && effectiveConfig.sav_types_included.length > 0) {
      savQuery = savQuery.in('sav_type', effectiveConfig.sav_types_included);
    }

    // Apply min age filter
    if (effectiveConfig.min_sav_age_days > 0) {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - effectiveConfig.min_sav_age_days);
      savQuery = savQuery.lte('created_at', minDate.toISOString());
    }

    const [savCases, allParts, orderItems] = await Promise.all([
      savQuery.order('created_at', { ascending: true }),
      
      supabaseClient
        .from('parts')
        .select('*')
        .eq('shop_id', profile.shop_id),
      
      supabaseClient
        .from('order_items')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .eq('ordered', false)
    ]);
    
    // Filter low stock parts using custom threshold
    const parts = {
      data: allParts.data?.filter(part => 
        part.quantity < (effectiveConfig.low_stock_threshold || 5)
      ) || [],
      error: allParts.error
    };

    if (savCases.error) {
      console.error('❌ [DAILY-ASSISTANT] Erreur SAV:', savCases.error);
      throw savCases.error;
    }
    if (parts.error) {
      console.error('❌ [DAILY-ASSISTANT] Erreur pièces:', parts.error);
      throw parts.error;
    }
    if (orderItems.error) {
      console.error('❌ [DAILY-ASSISTANT] Erreur commandes:', orderItems.error);
      throw orderItems.error;
    }

    console.log('✅ [DAILY-ASSISTANT] Données récupérées:', {
      savCount: savCases.data?.length,
      partsCount: parts.data?.length,
      ordersCount: orderItems.data?.length
    });

    // Prepare analysis data with custom late threshold
    const today = new Date();
    const lateSavs = savCases.data?.filter(sav => {
      const createdDate = new Date(sav.created_at);
      const daysSinceCreation = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCreation > effectiveConfig.late_threshold_days;
    }) || [];

    const readySavs = savCases.data?.filter(sav => {
      const allPartsAvailable = sav.sav_parts?.every((sp: any) => {
        if (!sp.part_id) return true;
        const part = sp.part;
        return part && (part.quantity - (part.reserved_quantity || 0)) >= sp.quantity;
      });
      return allPartsAvailable && sav.status !== 'ready';
    }) || [];

    const waitingForParts = savCases.data?.filter(sav => {
      return sav.sav_parts?.some((sp: any) => {
        if (!sp.part_id) return false;
        const part = sp.part;
        return part && (part.quantity - (part.reserved_quantity || 0)) < sp.quantity;
      });
    }) || [];

    const topN = effectiveConfig.top_items_count || 5;
    const analysisData = {
      total_active_savs: savCases.data?.length || 0,
      late_savs_count: lateSavs.length,
      late_savs: lateSavs.slice(0, topN).map(s => ({
        case_number: s.case_number,
        customer: `${s.customer?.first_name} ${s.customer?.last_name}`,
        device: `${s.device_brand} ${s.device_model}`,
        days_late: Math.floor((today.getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        status: s.status
      })),
      ready_to_repair_count: readySavs.length,
      ready_savs: readySavs.slice(0, topN).map(s => ({
        case_number: s.case_number,
        customer: `${s.customer?.first_name} ${s.customer?.last_name}`,
        estimated_time: s.total_time_minutes,
        revenue: s.total_cost
      })),
      waiting_parts_count: waitingForParts.length,
      low_stock_parts: parts.data?.length || 0,
      pending_orders: orderItems.data?.length || 0,
      total_potential_revenue: readySavs.reduce((sum, s) => sum + (s.total_cost || 0), 0),
      total_repair_time: readySavs.reduce((sum, s) => sum + (s.total_time_minutes || 0), 0)
    };

    console.log('📈 [DAILY-ASSISTANT] Données d\'analyse préparées:', analysisData);

    // Build dynamic system prompt based on tone and priority
    console.log('🤖 [DAILY-ASSISTANT] Appel de Lovable AI...');

    const toneInstructions = {
      professional: 'Utilise un ton formel et technique. Fournis des analyses détaillées et précises.',
      motivating: 'Utilise un ton encourageant et dynamique. Inspire l\'action et la progression.',
      concise: 'Sois direct et concis. Va droit au but avec des phrases courtes.',
      detailed: 'Fournis des analyses approfondies avec beaucoup de détails et d\'explications.'
    };

    const priorityInstructions = {
      revenue: 'Priorise les actions qui maximisent le chiffre d\'affaires et les marges.',
      satisfaction: 'Priorise la satisfaction client et la résolution rapide des SAV en retard.',
      productivity: 'Priorise l\'efficacité opérationnelle et l\'optimisation du temps.',
      balanced: 'Équilibre entre revenus, satisfaction client et productivité.'
    };

    const systemPrompt = `Tu es un assistant IA spécialisé dans la gestion d'ateliers de réparation.
${toneInstructions[effectiveConfig.tone as keyof typeof toneInstructions] || toneInstructions.professional}
${priorityInstructions[effectiveConfig.analysis_priority as keyof typeof priorityInstructions] || priorityInstructions.balanced}

Tu analyses les données de l'atelier et fournis des recommandations concrètes et actionnables.
Structure ta réponse avec des sections claires et des bullet points.
Utilise des émojis pour rendre la lecture plus agréable.`;

    // Build sections based on enabled config
    const sections = [];
    const sectionsConfig = effectiveConfig.sections_enabled;
    
    if (sectionsConfig.daily_priorities) sections.push('1. 🎯 PRIORITÉS DU JOUR : Quelle réparation faire en premier et pourquoi');
    if (sectionsConfig.quick_actions) sections.push('2. ⚡ ACTIONS RAPIDES : Quick wins pour avancer');
    if (sectionsConfig.parts_management) sections.push('3. 📦 GESTION DES PIÈCES : Quelles commandes passer en priorité');
    if (sectionsConfig.productivity_tips) sections.push('4. 💡 CONSEILS PRODUCTIVITÉ : Comment optimiser le temps');
    if (sectionsConfig.revenue_optimization) sections.push('5. 💰 OPTIMISATION REVENUS : Comment maximiser le CA et les marges');

    const userPrompt = `Analyse les données suivantes de l'atelier et fournis des recommandations :

SITUATION ACTUELLE :
- SAV actifs : ${analysisData.total_active_savs}
- SAV en retard (>${effectiveConfig.late_threshold_days}j) : ${analysisData.late_savs_count}
- SAV prêts à réparer : ${analysisData.ready_to_repair_count}
- En attente de pièces : ${analysisData.waiting_parts_count}
- Pièces en stock faible : ${analysisData.low_stock_parts}
- Commandes à passer : ${analysisData.pending_orders}
- Revenu potentiel aujourd'hui : ${analysisData.total_potential_revenue}€
- Temps de réparation estimé : ${Math.round(analysisData.total_repair_time / 60)}h

${lateSavs.length > 0 ? `\nSAV EN RETARD (TOP ${topN}) :\n${analysisData.late_savs.map(s => 
  `- ${s.case_number} : ${s.customer} (${s.device}) - ${s.days_late}j de retard`
).join('\n')}` : ''}

${readySavs.length > 0 ? `\nSAV PRÊTS À RÉPARER (TOP ${topN}) :\n${analysisData.ready_savs.map(s => 
  `- ${s.case_number} : ${s.customer} - ${Math.round(s.estimated_time / 60)}h - ${s.revenue}€`
).join('\n')}` : ''}

Fournis maintenant :
${sections.join('\n')}`;

    const aiResponse = await fetch(aiConfig.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    console.log('📡 [DAILY-ASSISTANT] Réponse AI status:', aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ [DAILY-ASSISTANT] Erreur Lovable AI:', aiResponse.status, errorText);
      
      // Gestion des erreurs spécifiques
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit: Trop de requêtes IA. Veuillez réessayer dans quelques minutes.' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required: Crédits IA insuffisants. Ajoutez des crédits dans votre espace Lovable.' }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`Erreur Lovable AI (${aiResponse.status}): ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('✅ [DAILY-ASSISTANT] Réponse AI reçue, longueur:', aiData.choices[0]?.message?.content?.length);
    
    const recommendations = aiData.choices[0].message.content;

    console.log('✅ [DAILY-ASSISTANT] Envoi de la réponse finale');
    return new Response(
      JSON.stringify({
        recommendations,
        stats: analysisData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ [DAILY-ASSISTANT] Erreur critique:', error);
    console.error('❌ [DAILY-ASSISTANT] Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erreur inconnue',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
