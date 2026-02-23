import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAIConfig(supabaseClient: any) {
  try {
    const { data } = await supabaseClient.from("ai_engine_config").select("*").eq("is_active", true).maybeSingle();
    if (!data || data.provider === "lovable") {
      return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY"), model: data?.model || "google/gemini-2.5-flash" };
    }
    const apiKey = Deno.env.get(data.api_key_name);
    if (!apiKey) return { url: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: Deno.env.get("LOVABLE_API_KEY"), model: "google/gemini-2.5-flash" };
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

  try {
    const { question, shopId } = await req.json();

    if (!question || !shopId) {
      return new Response(
        JSON.stringify({ error: 'Question et shopId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Créer le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get AI config
    const aiConfig = await getAIConfig(supabase);
    if (!aiConfig.apiKey) {
      return new Response(
        JSON.stringify({ error: "Clé API IA non configurée" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching data for shop: ${shopId}`);

    // Récupérer les données du shop en parallèle
    const [
      savCasesResult,
      partsResult,
      customersResult,
      quotesResult,
      savPartsResult,
      shopResult
    ] = await Promise.all([
      supabase
        .from('sav_cases')
        .select(`
          id, case_number, status, sav_type, created_at, updated_at,
          device_brand, device_model, problem_description,
          total_cost, deposit_amount, takeover_amount, taken_over,
          customer_id, customers(first_name, last_name)
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(500),
      
      supabase
        .from('parts')
        .select('id, name, reference, quantity, purchase_price, selling_price, min_stock, supplier')
        .eq('shop_id', shopId),
      
      supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone, created_at')
        .eq('shop_id', shopId),
      
      supabase
        .from('quotes')
        .select('id, quote_number, status, total_amount, customer_name, created_at, accepted_at, rejected_at')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(200),
      
      supabase
        .from('sav_parts')
        .select(`
          id, quantity, unit_price, purchase_price, time_minutes,
          part_id, sav_case_id, custom_part_name,
          parts(name, reference)
        `),
      
      supabase
        .from('shops')
        .select('name, subscription_tier')
        .eq('id', shopId)
        .single()
    ]);

    // Filtrer sav_parts pour ce shop (via sav_cases)
    const savCaseIds = savCasesResult.data?.map(s => s.id) || [];
    const shopSavParts = savPartsResult.data?.filter(sp => savCaseIds.includes(sp.sav_case_id)) || [];

    // Construire un résumé des données pour l'IA
    const dataContext = buildDataContext({
      savCases: savCasesResult.data || [],
      parts: partsResult.data || [],
      customers: customersResult.data || [],
      quotes: quotesResult.data || [],
      savParts: shopSavParts,
      shopName: shopResult.data?.name || 'Boutique'
    });

    console.log(`Data context built, length: ${dataContext.length} chars`);

    const systemPrompt = `Tu es un assistant intelligent pour Fixway, une application de gestion de SAV (Service Après-Vente) pour les réparateurs de téléphones et appareils électroniques.

Tu as accès aux données suivantes de la boutique "${shopResult.data?.name || 'Boutique'}":

${dataContext}

INSTRUCTIONS IMPORTANTES:
- Réponds toujours en français
- Sois précis dans tes calculs et cite tes sources de données
- Pour les calculs financiers, indique clairement les montants
- Si tu ne trouves pas l'information demandée, dis-le clairement
- Formate tes réponses de manière lisible avec des listes à puces si nécessaire
- Pour les dates, utilise le format français (JJ/MM/AAAA)
- "Prise en charge" ou "reprise" signifie que taken_over=true et takeover_amount > 0
- Le taux de rentabilité = (total_cost - coût_achat_pieces) / total_cost * 100
- Les statuts SAV courants: pending, in_progress, parts_ordered, testing, ready, cancelled

Aujourd'hui nous sommes le ${new Date().toLocaleDateString('fr-FR')}.`;

    // Appel à l'API IA
    const response = await fetch(aiConfig.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    const answer = aiResult.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer une réponse.";

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-data-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildDataContext(data: {
  savCases: any[];
  parts: any[];
  customers: any[];
  quotes: any[];
  savParts: any[];
  shopName: string;
}): string {
  const { savCases, parts, customers, quotes, savParts, shopName } = data;

  // Stats générales
  const totalSav = savCases.length;
  const savByStatus: Record<string, number> = {};
  const savByType: Record<string, number> = {};
  const savWithTakeover = savCases.filter(s => s.taken_over && s.takeover_amount > 0);
  const totalTakeoverAmount = savWithTakeover.reduce((sum, s) => sum + (s.takeover_amount || 0), 0);
  const totalRevenue = savCases.reduce((sum, s) => sum + (s.total_cost || 0), 0);
  const totalDeposits = savCases.reduce((sum, s) => sum + (s.deposit_amount || 0), 0);

  savCases.forEach(s => {
    savByStatus[s.status] = (savByStatus[s.status] || 0) + 1;
    savByType[s.sav_type] = (savByType[s.sav_type] || 0) + 1;
  });

  // Calcul des coûts d'achat pour la rentabilité
  const purchaseCosts: Record<string, number> = {};
  savParts.forEach(sp => {
    if (sp.sav_case_id) {
      purchaseCosts[sp.sav_case_id] = (purchaseCosts[sp.sav_case_id] || 0) + 
        (sp.purchase_price || 0) * (sp.quantity || 1);
    }
  });

  // Stats pièces
  const totalParts = parts.length;
  const totalStock = parts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const lowStockParts = parts.filter(p => p.quantity !== null && p.min_stock !== null && p.quantity <= p.min_stock);
  const stockValue = parts.reduce((sum, p) => sum + ((p.quantity || 0) * (p.purchase_price || 0)), 0);

  // Utilisation des pièces
  const partUsage: Record<string, { name: string; quantity: number }> = {};
  savParts.forEach(sp => {
    const partName = sp.parts?.name || sp.custom_part_name || 'Inconnu';
    const partRef = sp.parts?.reference || '';
    const key = `${partName}${partRef ? ` (${partRef})` : ''}`;
    if (!partUsage[key]) {
      partUsage[key] = { name: key, quantity: 0 };
    }
    partUsage[key].quantity += sp.quantity || 1;
  });

  // Trier par utilisation
  const topUsedParts = Object.values(partUsage)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20);

  // Stats devis
  const totalQuotes = quotes.length;
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
  const rejectedQuotes = quotes.filter(q => q.status === 'rejected').length;
  const quotesRevenue = quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + (q.total_amount || 0), 0);

  // Construction du contexte
  let context = `=== DONNÉES DE LA BOUTIQUE "${shopName}" ===

📊 STATISTIQUES GÉNÉRALES SAV:
- Total SAV: ${totalSav}
- Répartition par statut: ${Object.entries(savByStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}
- Répartition par type: ${Object.entries(savByType).map(([k, v]) => `${k}: ${v}`).join(', ')}
- SAV avec prise en charge: ${savWithTakeover.length}
- Montant total prises en charge: ${totalTakeoverAmount.toFixed(2)}€
- Chiffre d'affaires total (total_cost): ${totalRevenue.toFixed(2)}€
- Total acomptes encaissés: ${totalDeposits.toFixed(2)}€

📦 STATISTIQUES PIÈCES:
- Nombre de références: ${totalParts}
- Stock total: ${totalStock} unités
- Valeur du stock (prix d'achat): ${stockValue.toFixed(2)}€
- Pièces en stock bas: ${lowStockParts.length}

📋 TOP 20 PIÈCES LES PLUS UTILISÉES:
${topUsedParts.map((p, i) => `${i + 1}. ${p.name}: ${p.quantity} utilisé(s)`).join('\n')}

💼 STATISTIQUES DEVIS:
- Total devis: ${totalQuotes}
- Devis acceptés: ${acceptedQuotes}
- Devis refusés: ${rejectedQuotes}
- CA devis acceptés: ${quotesRevenue.toFixed(2)}€

👥 CLIENTS:
- Total clients: ${customers.length}

`;

  // Détails des SAV récents (max 100 pour éviter un contexte trop long)
  context += `\n=== DÉTAILS DES ${Math.min(100, savCases.length)} SAV LES PLUS RÉCENTS ===\n`;
  
  savCases.slice(0, 100).forEach(sav => {
    const customerName = sav.customers 
      ? `${sav.customers.first_name || ''} ${sav.customers.last_name || ''}`.trim() 
      : 'Client inconnu';
    const createdDate = new Date(sav.created_at).toLocaleDateString('fr-FR');
    const purchaseCost = purchaseCosts[sav.id] || 0;
    
    context += `
- N°${sav.case_number} (${createdDate})
  Client: ${customerName}
  Appareil: ${sav.device_brand || ''} ${sav.device_model || ''}
  Type: ${sav.sav_type} | Statut: ${sav.status}
  Total: ${sav.total_cost || 0}€ | Coût pièces: ${purchaseCost.toFixed(2)}€
  Acompte: ${sav.deposit_amount || 0}€
  Prise en charge: ${sav.taken_over ? `Oui (${sav.takeover_amount || 0}€)` : 'Non'}
`;
  });

  // Détails du stock
  context += `\n=== DÉTAIL DU STOCK (${parts.length} références) ===\n`;
  parts.forEach(part => {
    context += `- ${part.name}${part.reference ? ` (${part.reference})` : ''}: ${part.quantity || 0} en stock, PA: ${part.purchase_price || 0}€, PV: ${part.selling_price || 0}€\n`;
  });

  return context;
}
