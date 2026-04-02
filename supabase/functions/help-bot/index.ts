import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SYSTEM_PROMPT = `Tu es l'assistant IA intégré au logiciel de gestion SAV "Fixway". Tu aides les utilisateurs (techniciens, admins de boutique) à utiliser le logiciel.

## Modules du logiciel

### SAV (Service Après-Vente)
- **Créer un SAV** : Menu "SAV" → bouton "+ Nouveau SAV". Remplir : type de SAV, client, appareil (marque/modèle/IMEI), description du problème, pièces nécessaires.
- **Liste SAV** : Page /sav. Filtres par type, statut, couleur, grade. Recherche par numéro, client, appareil.
- **Détail SAV** : Cliquer sur un SAV pour voir/modifier les détails, ajouter des pièces, changer le statut, voir la timeline.
- **Statuts** : En attente → En cours → Pièces commandées → Tests → Prêt → Livré. Personnalisables dans les paramètres.
- **Types de SAV** : SAV Interne, SAV Externe. Personnalisables dans les paramètres.
- **Suivi client** : Chaque SAV a un lien de suivi (QR code) que le client peut consulter sans compte.
- **Messagerie** : Communication client↔boutique via messagerie intégrée ou SMS.
- **Codes de sécurité** : Stockage sécurisé des codes PIN/pattern du client.

### Pièces / Stock
- **Catalogue** : Page /parts. Liste de toutes les pièces avec stock, prix d'achat/vente, fournisseur.
- **Ajouter une pièce** : Bouton "+ Nouvelle pièce". Remplir nom, référence, prix, stock initial, stock minimum.
- **Stock** : Le stock se décrémente automatiquement quand un SAV est terminé. Alertes quand stock < minimum.
- **Import** : Import CSV/Excel pour ajouter des pièces en masse.

### Devis
- **Créer un devis** : Page /quotes → "+ Nouveau devis". Sélectionner client, ajouter des lignes (pièces ou services).
- **Envoi** : Envoyer par SMS avec lien public. Le client peut accepter/refuser en ligne.
- **Statuts** : Brouillon → Envoyé → Accepté/Refusé → Terminé.

### Clients
- **Liste** : Page /customers. Recherche, filtre, ajout.
- **Fiche client** : Historique des SAV, devis, messages.
- **Import** : Import CSV des clients.

### Commandes
- **Page /orders** : Onglet "SAV" montre les SAV nécessitant des pièces hors stock.
- **Onglet "Pièces"** : Vue d'ensemble des pièces à commander.

### Statistiques
- **Tableau de bord** : Page /statistics. Widgets configurables : CA, marges, pièces utilisées, temps moyen, taux de retard, satisfaction client.
- **Configuration** : Chaque widget peut avoir sa propre temporalité (mois glissant, mois calendaire, trimestre, année).
- **Widgets personnalisés** : Créer des widgets via IA en décrivant ce qu'on veut voir.

### Agenda
- **Page /agenda** : Planifier des rendez-vous (dépôt, récupération, diagnostic).
- **Proposition** : Envoyer un lien au client pour confirmer/proposer un autre créneau.
- **Horaires** : Configurer les heures de travail et créneaux bloqués.

### Messagerie / Chats
- **Page /client-chats** : Vue d'ensemble de toutes les conversations clients.
- **SMS** : Envoi de SMS aux clients (crédits SMS selon abonnement).

### Paramètres
- **Profil** : Page /settings → onglet Profil. Nom, prénom, téléphone.
- **Boutique** : Nom, adresse, email, téléphone, logo.
- **Équipe** : Inviter des techniciens via code d'invitation.
- **Types SAV** : Personnaliser les types de SAV.
- **Statuts SAV** : Personnaliser les statuts et leurs couleurs.
- **Menu** : Configurer quels menus sont visibles.

### Abonnement
- **Page /subscription** : Voir le plan actuel, limites, upgrader.
- **Plans** : Gratuit, Premium, Enterprise avec différentes limites SAV/SMS.

### Support
- **Page /support** : Créer des tickets de support, échanger avec l'équipe Fixway.

## Règles
1. Réponds UNIQUEMENT aux questions liées au logiciel Fixway et à son utilisation.
2. Sois concis, pratique et guide l'utilisateur étape par étape.
3. Si la question est hors du périmètre du logiciel (questions techniques générales, questions personnelles, etc.), réponds poliment que tu ne peux pas aider et que tu vas transférer la demande à un humain.
4. Si tu détectes que le profil ou la boutique de l'utilisateur est incomplet, suggère de compléter la configuration.
5. Utilise le format Markdown pour structurer tes réponses.
6. IMPORTANT: Réponds en texte brut markdown, PAS en JSON. Ta réponse sera directement affichée à l'utilisateur.
7. Si tu ne peux pas répondre car la question est hors périmètre, commence ta réponse par [ESCALATE] suivi d'un résumé court, puis donne ta réponse à l'utilisateur.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history, userContext } = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT }
    ]

    // Add user context if available
    if (userContext) {
      messages.push({
        role: 'system',
        content: `Contexte utilisateur actuel :
- Profil rempli : ${userContext.profileComplete ? 'Oui' : 'Non (suggérer de compléter)'}
- Boutique configurée : ${userContext.shopComplete ? 'Oui' : 'Non (suggérer de configurer)'}
- Rôle : ${userContext.role || 'inconnu'}
- Nom boutique : ${userContext.shopName || 'non configuré'}`
      })
    }

    // Add conversation history
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message })

    // Get AI engine config
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: aiConfig } = await supabaseAdmin
      .from('ai_engine_config')
      .select('*')
      .eq('is_active', true)
      .single()

    const apiKeyName = aiConfig?.api_key_name || 'LOVABLE_API_KEY'
    const apiKey = Deno.env.get(apiKeyName)
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        message: "Le service IA n'est pas configuré. Contactez l'administrateur.",
        escalate: true,
        escalate_summary: "Service IA non configuré - clé API manquante"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const model = aiConfig?.model || 'google/gemini-3-flash-preview'
    const isLovable = aiConfig?.provider === 'lovable' || apiKeyName === 'LOVABLE_API_KEY'
    
    const baseUrl = isLovable 
      ? 'https://ai.gateway.lovable.dev/v1' 
      : aiConfig?.provider === 'google' 
        ? 'https://generativelanguage.googleapis.com/v1beta/openai'
        : 'https://api.openai.com/v1'

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API error:', response.status, errorText)
      
      if (response.status === 429) {
        return new Response(JSON.stringify({
          message: "Le service est temporairement surchargé. Réessayez dans quelques secondes.",
          escalate: false,
          escalate_summary: null
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({
          message: "Les crédits IA sont épuisés. Contactez l'administrateur.",
          escalate: true,
          escalate_summary: "Crédits IA épuisés"
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      return new Response(JSON.stringify({
        message: "Désolé, je rencontre un problème technique. Réessayez dans quelques instants.",
        escalate: false,
        escalate_summary: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu traiter votre demande."

    // Check for escalation marker
    const shouldEscalate = content.startsWith('[ESCALATE]')
    let cleanMessage = content
    let escalateSummary: string | null = null
    
    if (shouldEscalate) {
      // Extract summary from first line after [ESCALATE]
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
      escalate: false,
      escalate_summary: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
