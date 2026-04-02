import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SYSTEM_PROMPT = `Tu es l'assistant IA intégré au logiciel de gestion SAV "Fixway". Tu aides les utilisateurs (techniciens, admins de boutique) à utiliser le logiciel.

## Règles
1. Réponds UNIQUEMENT aux questions liées au logiciel Fixway et à son utilisation.
2. Sois concis, pratique et guide l'utilisateur étape par étape.
3. Si la question est hors du périmètre du logiciel (questions techniques générales, questions personnelles, etc.), réponds poliment que tu ne peux aider que pour l'utilisation de Fixway et propose de transférer la demande à un humain.
4. Si tu détectes que le profil ou la boutique de l'utilisateur est incomplet, suggère de compléter la configuration.
5. Utilise le format Markdown pour structurer tes réponses.
6. Si tu ne peux pas répondre car la question est hors périmètre, commence ta réponse par [ESCALATE] suivi d'un résumé court, puis donne ta réponse à l'utilisateur.
7. NE PROPOSE JAMAIS de créer un ticket toi-même. Le système le propose automatiquement si nécessaire.`

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

    // Use LOVABLE_API_KEY directly - no ai_engine_config dependency
    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        message: "Le service IA n'est pas configuré. Contactez l'administrateur.",
        escalate: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Search knowledge base for relevant context
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let knowledgeContext = ''
    const matchedIds: string[] = []
    
    try {
      const words = message.toLowerCase()
        .replace(/[^a-zàâäéèêëïîôùûüÿçœæ\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)

      if (words.length > 0) {
        // Search by keywords overlap
        const { data: knowledgeItems } = await supabaseAdmin
          .from('help_bot_knowledge')
          .select('*')
          .order('usage_count', { ascending: false })
          .limit(50)

        if (knowledgeItems && knowledgeItems.length > 0) {
          // Score each entry by keyword matches
          const scored = knowledgeItems.map(item => {
            const itemKeywords = (item.keywords || []).map((k: string) => k.toLowerCase())
            const questionWords = item.question.toLowerCase().split(/\s+/)
            let score = 0
            for (const word of words) {
              if (itemKeywords.some((kw: string) => kw.includes(word) || word.includes(kw))) score += 3
              if (questionWords.some(qw => qw.includes(word) || word.includes(qw))) score += 1
            }
            return { ...item, score }
          }).filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)

          if (scored.length > 0) {
            knowledgeContext = '\n\n## Documentation pertinente trouvée\n\n'
            for (const item of scored) {
              knowledgeContext += `### ${item.question}\n${item.answer}\n\n`
              matchedIds.push(item.id)
            }
          }
        }
      }
    } catch (e) {
      console.error('Knowledge search error:', e)
    }

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT + knowledgeContext }
    ]

    if (userContext) {
      messages.push({
        role: 'system',
        content: `Contexte utilisateur actuel :
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

    // Check for escalation marker
    const shouldEscalate = content.startsWith('[ESCALATE]')
    let cleanMessage = content
    let escalateSummary: string | null = null
    
    if (shouldEscalate) {
      const lines = content.replace('[ESCALATE]', '').trim().split('\n')
      escalateSummary = lines[0].trim()
      cleanMessage = lines.slice(1).join('\n').trim() || escalateSummary
    }

    // Increment usage_count for matched knowledge entries
    if (matchedIds.length > 0) {
      try {
        for (const id of matchedIds) {
          await supabaseAdmin
            .from('help_bot_knowledge')
            .update({ usage_count: supabaseAdmin.rpc ? undefined : 0 })
            .eq('id', id)
        }
        // Use raw SQL increment via rpc if available, otherwise just log
        await supabaseAdmin.rpc('increment_knowledge_usage' as any, { ids: matchedIds }).catch(() => {
          // Fallback: individual updates
          matchedIds.forEach(id => {
            supabaseAdmin.from('help_bot_knowledge')
              .select('usage_count')
              .eq('id', id)
              .single()
              .then(({ data: item }) => {
                if (item) {
                  supabaseAdmin.from('help_bot_knowledge')
                    .update({ usage_count: (item as any).usage_count + 1 })
                    .eq('id', id)
                    .then(() => {})
                }
              })
          })
        })
      } catch (e) {
        console.error('Usage count update error:', e)
      }
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
