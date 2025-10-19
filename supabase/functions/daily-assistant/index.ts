import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user's shop_id
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Non authentifié');
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.shop_id) {
      throw new Error('Boutique introuvable');
    }

    // Fetch relevant data
    const [savCases, parts, orderItems] = await Promise.all([
      supabaseClient
        .from('sav_cases')
        .select(`
          *,
          customer:customers(first_name, last_name),
          sav_parts(*, part:parts(*))
        `)
        .eq('shop_id', profile.shop_id)
        .not('status', 'in', '(delivered,cancelled)')
        .order('created_at', { ascending: true }),
      
      supabaseClient
        .from('parts')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .lt('quantity', 'min_stock'),
      
      supabaseClient
        .from('order_items')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .eq('ordered', false)
    ]);

    if (savCases.error) throw savCases.error;
    if (parts.error) throw parts.error;
    if (orderItems.error) throw orderItems.error;

    // Prepare analysis data
    const today = new Date();
    const lateSavs = savCases.data?.filter(sav => {
      const createdDate = new Date(sav.created_at);
      const daysSinceCreation = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCreation > 3;
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

    const analysisData = {
      total_active_savs: savCases.data?.length || 0,
      late_savs_count: lateSavs.length,
      late_savs: lateSavs.slice(0, 3).map(s => ({
        case_number: s.case_number,
        customer: `${s.customer?.first_name} ${s.customer?.last_name}`,
        device: `${s.device_brand} ${s.device_model}`,
        days_late: Math.floor((today.getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        status: s.status
      })),
      ready_to_repair_count: readySavs.length,
      ready_savs: readySavs.slice(0, 3).map(s => ({
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

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configuré');
    }

    const systemPrompt = `Tu es un assistant IA spécialisé dans la gestion d'ateliers de réparation. 
Tu analyses les données de l'atelier et fournis des recommandations concrètes et actionnables pour :
1. Organiser efficacement la journée
2. Prioriser les réparations selon l'urgence et le potentiel de revenus
3. Gérer les pièces et les commandes
4. Améliorer la productivité
5. Augmenter les marges et le chiffre d'affaires

Sois concis, précis et actionnable. Structure ta réponse avec des sections claires et des bullet points.
Utilise des émojis pour rendre la lecture plus agréable.`;

    const userPrompt = `Analyse les données suivantes de l'atelier et fournis des recommandations :

SITUATION ACTUELLE :
- SAV actifs : ${analysisData.total_active_savs}
- SAV en retard : ${analysisData.late_savs_count}
- SAV prêts à réparer : ${analysisData.ready_to_repair_count}
- En attente de pièces : ${analysisData.waiting_parts_count}
- Pièces en stock faible : ${analysisData.low_stock_parts}
- Commandes à passer : ${analysisData.pending_orders}
- Revenu potentiel aujourd'hui : ${analysisData.total_potential_revenue}€
- Temps de réparation estimé : ${Math.round(analysisData.total_repair_time / 60)}h

${lateSavs.length > 0 ? `\nSAV EN RETARD (TOP 3) :\n${analysisData.late_savs.map(s => 
  `- ${s.case_number} : ${s.customer} (${s.device}) - ${s.days_late}j de retard`
).join('\n')}` : ''}

${readySavs.length > 0 ? `\nSAV PRÊTS À RÉPARER (TOP 3) :\n${analysisData.ready_savs.map(s => 
  `- ${s.case_number} : ${s.customer} - ${Math.round(s.estimated_time / 60)}h - ${s.revenue}€`
).join('\n')}` : ''}

Fournis maintenant :
1. 🎯 PRIORITÉS DU JOUR : Quelle réparation faire en premier et pourquoi
2. ⚡ ACTIONS RAPIDES : Quick wins pour avancer
3. 📦 GESTION DES PIÈCES : Quelles commandes passer en priorité
4. 💡 CONSEILS PRODUCTIVITÉ : Comment optimiser le temps
5. 💰 OPTIMISATION REVENUS : Comment maximiser le CA et les marges`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error('Erreur lors de l\'analyse IA');
    }

    const aiData = await aiResponse.json();
    const recommendations = aiData.choices[0].message.content;

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
    console.error('Error in daily-assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
