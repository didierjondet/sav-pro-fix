import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SYSTEM_PROMPT = `Tu es l'assistant IA intégré au logiciel de gestion SAV "Fixway". Tu aides les utilisateurs (techniciens, admins de boutique) à utiliser le logiciel.

Tu as accès en temps réel aux données du magasin de l'utilisateur. Utilise ces données pour donner des réponses précises et contextualisées.

## Règles
1. Réponds aux questions liées au logiciel Fixway, à son utilisation, ET aux données métier du magasin (SAV en cours, stock, clients, devis, statistiques).
2. Quand l'utilisateur pose une question sur ses données (ex: "combien de SAV en cours ?", "quel est mon stock ?"), utilise les DONNÉES RÉELLES fournies dans le contexte ci-dessous.
3. Sois concis, pratique et guide l'utilisateur étape par étape.
4. Si la question est totalement hors du périmètre (questions personnelles, sujets sans rapport), réponds poliment que tu ne peux aider que pour Fixway et commence ta réponse par [ESCALATE] suivi d'un résumé court.
5. Si tu détectes que le profil ou la boutique est incomplet, suggère de compléter la configuration.
6. Utilise le format Markdown pour structurer tes réponses.
7. NE PROPOSE JAMAIS de créer un ticket toi-même. Le système le propose automatiquement si nécessaire.
8. Tu peux faire des analyses, des recommandations basées sur les données réelles du magasin.
9. Tu connais les règles métier configurées par le magasin (types de SAV, statuts personnalisés, etc.).

## Navigation du logiciel
- **Tableau de bord** : /home — Vue d'ensemble avec statistiques
- **SAV** : /sav — Liste des dossiers SAV, créer un nouveau via /sav/nouveau
- **Clients** : /customers — Gestion des clients
- **Pièces/Stock** : /parts — Inventaire et gestion du stock
- **Devis** : /quotes — Création et gestion des devis
- **Commandes** : /orders — Suivi des commandes de pièces
- **Agenda** : /agenda — Rendez-vous et planification
- **Statistiques** : /statistics — Tableaux de bord et widgets personnalisés
- **Rapports** : /reports — Rapports détaillés
- **Paramètres** : /settings — Configuration boutique, profil, IA, SMS, etc.
- **Abonnement** : /subscription — Gérer le plan d'abonnement
- **Support** : /support — Contacter le support Fixway`

async function fetchShopData(supabaseAdmin: any, shopId: string) {
  const context: string[] = []

  try {
    // Parallel queries for performance
    const [
      shopResult,
      savCountsResult,
      recentSavsResult,
      partsStatsResult,
      lowStockResult,
      customersCountResult,
      quotesResult,
      savTypesResult,
      savStatusesResult,
      ordersResult,
    ] = await Promise.all([
      // Shop info
      supabaseAdmin.from('shops').select('name, email, phone, address, subscription_tier, monthly_sav_count, monthly_sms_used, sms_credits_allocated, active_sav_count').eq('id', shopId).single(),
      // SAV counts by status
      supabaseAdmin.from('sav_cases').select('status').eq('shop_id', shopId),
      // Recent SAVs (last 10)
      supabaseAdmin.from('sav_cases').select('case_number, status, device_brand, device_model, sav_type, created_at, total_cost').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(10),
      // Parts stats
      supabaseAdmin.rpc('get_parts_statistics', { p_shop_id: shopId }),
      // Low stock parts
      supabaseAdmin.from('parts').select('name, quantity, min_stock, reference').eq('shop_id', shopId).not('min_stock', 'is', null).limit(20),
      // Customers count
      supabaseAdmin.from('customers').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
      // Recent quotes
      supabaseAdmin.from('quotes').select('quote_number, status, customer_name, total_amount, created_at').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(5),
      // SAV types config
      supabaseAdmin.from('shop_sav_types').select('type_key, type_label, type_color, is_active, max_processing_days, alert_days').eq('shop_id', shopId).eq('is_active', true).order('display_order'),
      // SAV statuses config
      supabaseAdmin.from('shop_sav_statuses').select('status_key, status_label, status_color, is_active, is_final_status, pause_timer').eq('shop_id', shopId).eq('is_active', true).order('display_order'),
      // Pending orders
      supabaseAdmin.from('order_items').select('part_name, quantity_needed, priority, ordered').eq('shop_id', shopId).eq('ordered', false).limit(10),
    ])

    // Shop info
    if (shopResult.data) {
      const s = shopResult.data
      context.push(`## Informations du magasin
- Nom : ${s.name}
- Email : ${s.email || 'non configuré'}
- Téléphone : ${s.phone || 'non configuré'}
- Adresse : ${s.address || 'non configurée'}
- Abonnement : ${s.subscription_tier}
- SAV créés ce mois : ${s.monthly_sav_count}
- SAV actifs : ${s.active_sav_count}
- SMS utilisés/alloués ce mois : ${s.monthly_sms_used}/${s.sms_credits_allocated || 0}`)
    }

    // SAV breakdown
    if (savCountsResult.data) {
      const statusCounts: Record<string, number> = {}
      for (const sav of savCountsResult.data) {
        statusCounts[sav.status] = (statusCounts[sav.status] || 0) + 1
      }
      context.push(`## SAV par statut (total: ${savCountsResult.data.length})
${Object.entries(statusCounts).map(([s, c]) => `- ${s}: ${c}`).join('\n')}`)
    }

    // Recent SAVs
    if (recentSavsResult.data?.length) {
      context.push(`## 10 derniers SAV
${recentSavsResult.data.map((s: any) => `- ${s.case_number} | ${s.status} | ${s.device_brand || ''} ${s.device_model || ''} | Type: ${s.sav_type} | Coût: ${s.total_cost ?? 'N/A'}€ | Créé: ${new Date(s.created_at).toLocaleDateString('fr-FR')}`).join('\n')}`)
    }

    // Parts stats
    if (partsStatsResult.data) {
      const p = Array.isArray(partsStatsResult.data) ? partsStatsResult.data[0] : partsStatsResult.data
      if (p) {
        context.push(`## Stock de pièces
- Quantité totale : ${p.total_quantity}
- Valeur totale : ${Number(p.total_value).toFixed(2)}€
- Pièces en stock bas : ${p.low_stock_count}`)
      }
    }

    // Low stock alerts
    if (lowStockResult.data?.length) {
      const lowStock = lowStockResult.data.filter((p: any) => p.quantity !== null && p.min_stock !== null && p.quantity <= p.min_stock)
      if (lowStock.length > 0) {
        context.push(`## ⚠️ Alertes stock bas
${lowStock.map((p: any) => `- ${p.name} (réf: ${p.reference || 'N/A'}) : ${p.quantity} en stock (seuil min: ${p.min_stock})`).join('\n')}`)
      }
    }

    // Customers
    context.push(`## Clients
- Nombre total : ${customersCountResult.count ?? 0}`)

    // Quotes
    if (quotesResult.data?.length) {
      context.push(`## 5 derniers devis
${quotesResult.data.map((q: any) => `- ${q.quote_number} | ${q.status} | ${q.customer_name} | ${q.total_amount}€ | ${new Date(q.created_at).toLocaleDateString('fr-FR')}`).join('\n')}`)
    }

    // SAV types (business rules)
    if (savTypesResult.data?.length) {
      context.push(`## Types de SAV configurés (règles métier)
${savTypesResult.data.map((t: any) => `- ${t.type_label} (clé: ${t.type_key}) | Délai max: ${t.max_processing_days ?? 'aucun'} jours | Alerte à: ${t.alert_days ?? 'aucun'} jours`).join('\n')}`)
    }

    // SAV statuses (business rules)
    if (savStatusesResult.data?.length) {
      context.push(`## Statuts SAV configurés (règles métier)
${savStatusesResult.data.map((s: any) => `- ${s.status_label} (clé: ${s.status_key}) | Final: ${s.is_final_status ? 'Oui' : 'Non'} | Pause timer: ${s.pause_timer ? 'Oui' : 'Non'}`).join('\n')}`)
    }

    // Pending orders
    if (ordersResult.data?.length) {
      context.push(`## Commandes en attente
${ordersResult.data.map((o: any) => `- ${o.part_name} x${o.quantity_needed} | Priorité: ${o.priority}`).join('\n')}`)
    }

  } catch (e) {
    console.error('Error fetching shop data:', e)
    context.push('## ⚠️ Certaines données n\'ont pas pu être chargées')
  }

  return context.join('\n\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history, userContext, shopId } = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        message: "Le service IA n'est pas configuré. Contactez l'administrateur.",
        escalate: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch real-time shop data if shopId provided
    let shopDataContext = ''
    if (shopId) {
      shopDataContext = await fetchShopData(supabaseAdmin, shopId)
    }

    // Search knowledge base for additional context
    let knowledgeContext = ''
    try {
      const words = message.toLowerCase()
        .replace(/[^a-zàâäéèêëïîôùûüÿçœæ\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 2)

      if (words.length > 0) {
        const { data: knowledgeItems } = await supabaseAdmin
          .from('help_bot_knowledge')
          .select('*')
          .order('usage_count', { ascending: false })
          .limit(50)

        if (knowledgeItems?.length) {
          const scored = knowledgeItems.map((item: any) => {
            const itemKeywords = (item.keywords || []).map((k: string) => k.toLowerCase())
            const questionWords = item.question.toLowerCase().split(/\s+/)
            let score = 0
            for (const word of words) {
              if (itemKeywords.some((kw: string) => kw.includes(word) || word.includes(kw))) score += 3
              if (questionWords.some((qw: string) => qw.includes(word) || word.includes(qw))) score += 1
            }
            return { ...item, score }
          }).filter((item: any) => item.score > 0)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 3)

          if (scored.length > 0) {
            knowledgeContext = '\n\n## Documentation complémentaire\n\n'
            for (const item of scored) {
              knowledgeContext += `### ${item.question}\n${item.answer}\n\n`
            }
          }
        }
      }
    } catch (e) {
      console.error('Knowledge search error:', e)
    }

    // Build messages array with real data context
    const fullSystemPrompt = SYSTEM_PROMPT + 
      (shopDataContext ? `\n\n# DONNÉES EN TEMPS RÉEL DU MAGASIN\n\n${shopDataContext}` : '') +
      knowledgeContext

    const messages: any[] = [
      { role: 'system', content: fullSystemPrompt }
    ]

    if (userContext) {
      messages.push({
        role: 'system',
        content: `Contexte utilisateur :
- Profil rempli : ${userContext.profileComplete ? 'Oui' : 'Non (suggérer de compléter dans Paramètres → Profil)'}
- Boutique configurée : ${userContext.shopComplete ? 'Oui' : 'Non (suggérer de configurer dans Paramètres → Boutique)'}
- Rôle : ${userContext.role || 'inconnu'}
- Nom boutique : ${userContext.shopName || 'non configuré'}`
      })
    }

    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })
      }
    }

    messages.push({ role: 'user', content: message })

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature: 0.5,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API error:', response.status, errorText)
      
      if (response.status === 429) {
        return new Response(JSON.stringify({
          message: "Le service est temporairement surchargé. Réessayez dans quelques secondes.",
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({
          message: "Les crédits IA sont épuisés. Contactez l'administrateur.",
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      return new Response(JSON.stringify({
        message: "Désolé, je rencontre un problème technique. Réessayez dans quelques instants.",
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu traiter votre demande."

    const shouldEscalate = content.startsWith('[ESCALATE]')
    let cleanMessage = content
    let escalateSummary: string | null = null
    
    if (shouldEscalate) {
      const lines = content.replace('[ESCALATE]', '').trim().split('\n')
      escalateSummary = lines[0].trim()
      cleanMessage = lines.slice(1).join('\n').trim() || escalateSummary
    }

    return new Response(JSON.stringify({
      message: cleanMessage,
      escalate: shouldEscalate,
      escalate_summary: escalateSummary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Help bot error:', error)
    return new Response(JSON.stringify({
      message: "Une erreur est survenue. Réessayez.",
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
