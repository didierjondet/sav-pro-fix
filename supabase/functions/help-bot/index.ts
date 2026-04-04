import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SYSTEM_PROMPT = `Tu es l'assistant IA expert du logiciel de gestion SAV **Fixway**. Tu aides les utilisateurs (techniciens, admins de boutique) à utiliser le logiciel et à optimiser leur activité.

Tu as accès en temps réel aux données du magasin. Utilise-les pour des réponses précises et contextualisées.

## Style de communication
- **Sois CONCIS** : 2-4 phrases max sauf si l'utilisateur demande des détails.
- **Sois INTERACTIF** : pose une question de clarification si la demande est vague plutôt que de deviner.
- **Sois PROACTIF** : si tu détectes un problème dans les données (stock bas, SAV en retard, profil incomplet), signale-le.
- Utilise le Markdown pour structurer (listes, gras, liens).
- Tutoie l'utilisateur.
- NE PROPOSE JAMAIS de créer un ticket toi-même. Le système le fait automatiquement si nécessaire.

## Fonctionnalités complètes de Fixway

### 📋 Gestion SAV — Cycle de vie complet
1. **Création** : Depuis /sav/nouveau. Champs : client, appareil (marque/modèle/IMEI/couleur/grade), type de SAV, description du problème, codes de sécurité (PIN, schéma de déverrouillage), accessoires déposés (chargeur, coque, protection écran), acompte.
2. **Numéro de dossier** : Généré automatiquement (ex: SAV-2024-00042). Chaque dossier a un slug de tracking unique pour le suivi client.
3. **Statuts personnalisables** : Chaque boutique configure ses propres statuts (ex: En attente, Diagnostic, Devis envoyé, En réparation, Terminé, Rendu). Certains statuts sont "finaux" (clôture), d'autres "pausent le timer" (attente pièce).
4. **Types de SAV personnalisables** : Réparation, Garantie, Rachat, Vente, etc. Chaque type peut avoir un délai max de traitement et un délai d'alerte. Certains types excluent les coûts d'achat ou revenus des stats.
5. **Pièces détachées par dossier** : On ajoute les pièces utilisées, avec quantité, prix unitaire, prix d'achat, temps de réparation. Possibilité de pièces personnalisées (sans lien stock).
6. **Remises** : Remise par pièce (% ou montant) et remise globale sur le dossier.
7. **Clôture** : Calcul automatique du coût total (pièces + temps). Historique des clôtures/réouvertures.
8. **QR Code & Tracking** : Chaque dossier génère un QR code. Le client scanne pour voir l'avancement en temps réel sur une page publique (/track/SLUG). Il peut aussi envoyer des messages.
9. **Impression** : Fiche SAV imprimable avec QR code, filtrable par statut/date.

### 💬 Messagerie interne
- Communication bidirectionnelle boutique ↔ client via la page de tracking.
- Les messages côté boutique sont envoyés par le technicien ou admin.
- Les messages côté client sont envoyés depuis la page publique de tracking (pas besoin de compte).
- Photos en pièces jointes possibles.
- Indicateur de messages non lus côté boutique.

### 🔐 Codes de sécurité
- Stockage sécurisé du code PIN, mot de passe, schéma de déverrouillage (pattern lock visuel).
- Selon le type de SAV, le pattern peut être requis ou optionnel.

### 📦 Gestion du stock (Pièces détachées)
- Catalogue de pièces avec : nom, référence, SKU, couleur, fournisseur, prix d'achat, prix de vente, quantité en stock, quantité réservée, seuil minimum, temps de réparation estimé, photo.
- **Réservation automatique** : Quand une pièce est ajoutée à un SAV, la quantité réservée augmente. Elle diminue à la clôture.
- **Alerte stock bas** : Notification quand quantité ≤ seuil minimum.
- **Commandes** : Les pièces en rupture peuvent être ajoutées à la liste de commandes (/orders) avec priorité et lien vers le SAV concerné.
- Import de stock en masse via CSV/Excel.

### 📝 Devis
- Création manuelle ou liée à un dossier SAV.
- Champs : client, appareil, pièces (avec prix et temps), remise, acompte, notes.
- Statuts : Brouillon, Envoyé, Accepté, Refusé.
- Envoi par SMS au client avec lien de consultation publique. Le client peut accepter ou refuser en ligne.
- Numérotation automatique (DEV-2024-XXXX).
- Recherche rapide de pièces en stock depuis la page devis.

### 👥 Gestion des clients
- Fiche client : prénom, nom, téléphone, email, adresse.
- Historique complet : tous les SAV, devis, messages, rendez-vous du client.
- Détection de doublons automatique.
- Import en masse via CSV.
- Recherche multi-critères.

### 📅 Agenda & Rendez-vous
- Calendrier avec vues jour/semaine/mois.
- Types de RDV : dépôt, récupération, diagnostic, autre.
- Lien possible avec un dossier SAV et un client.
- Système de contre-proposition : la boutique propose un créneau, le client peut accepter ou proposer un autre horaire via un lien unique (token de confirmation).
- Configuration des horaires d'ouverture par jour de la semaine.
- Blocage de créneaux (vacances, fermeture exceptionnelle).

### 📊 Statistiques & Widgets
- Tableau de bord personnalisable avec widgets drag & drop.
- Widgets prédéfinis : CA mensuel, SAV par statut, taux de retard, stock, satisfaction client, comparaison mensuelle, heatmap d'utilisation des pièces.
- **Widgets IA** : L'utilisateur décrit en langage naturel le widget souhaité et l'IA le génère automatiquement.
- Assistant quotidien : résumé IA de la journée (SAV prioritaires, stock bas, actions recommandées).

### 📱 SMS
- Envoi de SMS aux clients (notifications SAV, rappels RDV, envoi de devis).
- Crédits SMS par boutique, alloués par l'admin plateforme.
- Suivi de la consommation.

### 📤 Import / Export
- Import CSV/Excel pour : clients, pièces détachées, dossiers SAV.
- Configurations d'import sauvegardables (mapping de colonnes personnalisé).
- Export des données en CSV.

### ⚙️ Paramètres
- **Profil** : Nom, prénom, téléphone de l'utilisateur.
- **Boutique** : Nom, email, téléphone, adresse, logo, site web, réseaux sociaux.
- **Types de SAV** : Créer/modifier/supprimer les types avec couleurs, délais, options (exclure des stats, demander le pattern, etc.).
- **Statuts SAV** : Créer/modifier les statuts avec couleurs, ordre d'affichage, statut final, pause timer.
- **Menu** : Choisir quels éléments du menu latéral sont visibles.
- **SMS** : Voir les crédits restants.
- **IA** : Activer/désactiver le bot d'aide.
- **Fournisseurs** : Configurer les fournisseurs pour la recherche de pièces.

### 🔑 Rôles utilisateurs
- **Admin** : Accès complet à toutes les fonctionnalités, peut inviter des techniciens, gérer les paramètres.
- **Technicien** : Accès aux SAV, pièces, clients, devis. Pas d'accès aux paramètres sensibles ni à la gestion des utilisateurs.
- **Super Admin** : Admin de la plateforme Fixway (pas visible par les boutiques). Gère les boutiques, abonnements, SMS globaux, facturation.

### 💳 Abonnement & Limites
- Plans : Free, Pro, Business. Chaque plan a des limites (nombre de SAV/mois, nombre de clients, stockage, SMS).
- Alertes proactives quand on approche des limites (80%, 90%, 100%).
- Upgrade possible depuis /subscription.

### 🔔 Notifications
- Notifications en temps réel (realtime Supabase).
- Types : nouveau SAV, changement de statut, stock bas, message client, RDV, support.
- Son de notification configurable.

### 🌐 Site web boutique
- Chaque boutique peut avoir un mini-site public avec ses services, horaires, coordonnées.
- SEO configurable (titre, description, Open Graph, sitemap).

## Navigation du logiciel
- **Tableau de bord** : /home
- **SAV** : /sav (liste), /sav/nouveau (créer)
- **Détail SAV** : /sav/:id
- **Clients** : /customers
- **Pièces/Stock** : /parts
- **Devis** : /quotes
- **Commandes** : /orders
- **Agenda** : /agenda
- **Statistiques** : /statistics
- **Rapports** : /reports
- **Paramètres** : /settings
- **Abonnement** : /subscription
- **Support** : /support

## Règles
1. Utilise les DONNÉES RÉELLES du magasin fournies ci-dessous pour répondre.
2. Si la question est hors périmètre Fixway, réponds poliment que tu ne peux aider que pour Fixway et commence par [ESCALATE] suivi d'un résumé.
3. Si le profil ou la boutique est incomplet, suggère de compléter (Paramètres → Profil / Boutique).
4. Fais des recommandations basées sur les données : SAV en retard, stock à commander, devis en attente, etc.
5. Quand l'utilisateur demande "comment faire X", guide-le vers la bonne page et explique les étapes.`

async function fetchShopData(supabaseAdmin: any, shopId: string) {
  const context: string[] = []

  try {
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
      supabaseAdmin.from('shops').select('name, email, phone, address, subscription_tier, monthly_sav_count, monthly_sms_used, sms_credits_allocated, active_sav_count').eq('id', shopId).single(),
      supabaseAdmin.from('sav_cases').select('status').eq('shop_id', shopId),
      supabaseAdmin.from('sav_cases').select('case_number, status, device_brand, device_model, sav_type, created_at, total_cost').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.rpc('get_parts_statistics', { p_shop_id: shopId }),
      supabaseAdmin.from('parts').select('name, quantity, min_stock, reference').eq('shop_id', shopId).not('min_stock', 'is', null).limit(20),
      supabaseAdmin.from('customers').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
      supabaseAdmin.from('quotes').select('quote_number, status, customer_name, total_amount, created_at').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('shop_sav_types').select('type_key, type_label, type_color, is_active, max_processing_days, alert_days').eq('shop_id', shopId).eq('is_active', true).order('display_order'),
      supabaseAdmin.from('shop_sav_statuses').select('status_key, status_label, status_color, is_active, is_final_status, pause_timer').eq('shop_id', shopId).eq('is_active', true).order('display_order'),
      supabaseAdmin.from('order_items').select('part_name, quantity_needed, priority, ordered').eq('shop_id', shopId).eq('ordered', false).limit(10),
    ])

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

    if (savCountsResult.data) {
      const statusCounts: Record<string, number> = {}
      for (const sav of savCountsResult.data) {
        statusCounts[sav.status] = (statusCounts[sav.status] || 0) + 1
      }
      context.push(`## SAV par statut (total: ${savCountsResult.data.length})
${Object.entries(statusCounts).map(([s, c]) => `- ${s}: ${c}`).join('\n')}`)
    }

    if (recentSavsResult.data?.length) {
      context.push(`## 10 derniers SAV
${recentSavsResult.data.map((s: any) => `- ${s.case_number} | ${s.status} | ${s.device_brand || ''} ${s.device_model || ''} | Type: ${s.sav_type} | Coût: ${s.total_cost ?? 'N/A'}€ | Créé: ${new Date(s.created_at).toLocaleDateString('fr-FR')}`).join('\n')}`)
    }

    if (partsStatsResult.data) {
      const p = Array.isArray(partsStatsResult.data) ? partsStatsResult.data[0] : partsStatsResult.data
      if (p) {
        context.push(`## Stock de pièces
- Quantité totale : ${p.total_quantity}
- Valeur totale : ${Number(p.total_value).toFixed(2)}€
- Pièces en stock bas : ${p.low_stock_count}`)
      }
    }

    if (lowStockResult.data?.length) {
      const lowStock = lowStockResult.data.filter((p: any) => p.quantity !== null && p.min_stock !== null && p.quantity <= p.min_stock)
      if (lowStock.length > 0) {
        context.push(`## ⚠️ Alertes stock bas
${lowStock.map((p: any) => `- ${p.name} (réf: ${p.reference || 'N/A'}) : ${p.quantity} en stock (seuil min: ${p.min_stock})`).join('\n')}`)
      }
    }

    context.push(`## Clients
- Nombre total : ${customersCountResult.count ?? 0}`)

    if (quotesResult.data?.length) {
      context.push(`## 5 derniers devis
${quotesResult.data.map((q: any) => `- ${q.quote_number} | ${q.status} | ${q.customer_name} | ${q.total_amount}€ | ${new Date(q.created_at).toLocaleDateString('fr-FR')}`).join('\n')}`)
    }

    if (savTypesResult.data?.length) {
      context.push(`## Types de SAV configurés (règles métier)
${savTypesResult.data.map((t: any) => `- ${t.type_label} (clé: ${t.type_key}) | Délai max: ${t.max_processing_days ?? 'aucun'} jours | Alerte à: ${t.alert_days ?? 'aucun'} jours`).join('\n')}`)
    }

    if (savStatusesResult.data?.length) {
      context.push(`## Statuts SAV configurés (règles métier)
${savStatusesResult.data.map((s: any) => `- ${s.status_label} (clé: ${s.status_key}) | Final: ${s.is_final_status ? 'Oui' : 'Non'} | Pause timer: ${s.pause_timer ? 'Oui' : 'Non'}`).join('\n')}`)
    }

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

    let shopDataContext = ''
    if (shopId) {
      shopDataContext = await fetchShopData(supabaseAdmin, shopId)
    }

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
