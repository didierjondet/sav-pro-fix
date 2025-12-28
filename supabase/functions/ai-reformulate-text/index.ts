import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!text || text.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Le texte ne peut pas être vide" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Définir le prompt système selon le contexte
    let systemPrompt = "";
    switch (context) {
      case "problem_description":
        systemPrompt = `Tu es un assistant expert en réparation qui aide à reformuler les descriptions de problèmes techniques.
CONTEXTE IMPORTANT :
- L'agent en réception (qui crée le SAV avec le client) rédige ces notes
- Ces notes sont destinées aux TECHNICIENS de l'équipe qui vont prendre en charge la réparation
- Le client peut voir ces commentaires mais ils ne lui sont PAS destinés directement
- L'objectif est que le technicien comprenne rapidement la panne et les actions à mener

Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Structurer le texte pour une lecture rapide par un technicien
- Mettre en avant les symptômes, le contexte de la panne et les attentes du client
- Utiliser un vocabulaire technique clair mais accessible
- Garder les informations essentielles sans inventer de détails
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
        break;
      case "repair_notes":
        systemPrompt = `Tu es un technicien expert qui aide à reformuler les notes de réparation.
CONTEXTE IMPORTANT :
- Ces notes documentent les interventions effectuées par le technicien
- Elles sont destinées à l'équipe technique et au suivi du dossier
- Le client peut les consulter mais elles servent avant tout de trace technique

Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Organiser les informations de manière logique (diagnostic, intervention, résultat)
- Utiliser un vocabulaire technique approprié mais compréhensible
- Détailler clairement les interventions effectuées
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
        break;
      case "technician_comments":
        systemPrompt = `Tu es un assistant expert qui aide à reformuler les commentaires dans un SAV.
CONTEXTE IMPORTANT :
- L'AGENT qui reçoit le client rédige ces commentaires
- Ces commentaires sont destinés aux TECHNICIENS de l'équipe
- L'objectif est de transmettre clairement la demande du client et le contexte de la panne
- Le client peut voir ces commentaires mais ils ne lui sont pas adressés directement

Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Structurer l'information pour une compréhension rapide par le technicien
- Mettre en avant : ce que le client a décrit, les symptômes observés, les actions attendues
- Garder un ton professionnel et factuel
- Éviter le jargon incompréhensible mais rester technique si nécessaire
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
        break;
      case "private_comments":
        systemPrompt = `Tu es un assistant qui aide à reformuler les notes internes pour qu'elles soient claires et organisées.
Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Structurer les informations de manière logique
- Garder un style direct et factuel
- Conserver tous les détails techniques importants
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
        break;
      case "chat_message":
        systemPrompt = `Tu es un assistant qui aide à reformuler les messages de chat pour qu'ils soient clairs, polis et professionnels.
Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Rendre le message plus fluide et naturel
- Garder un ton professionnel mais amical
- Conserver le sens original du message
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
        break;
      case "sms_message":
        systemPrompt = `Tu es un assistant qui aide à reformuler les SMS professionnels pour qu'ils soient clairs et efficaces.
Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Garder un ton professionnel mais chaleureux
- IMPÉRATIF : Respecter une limite stricte de 160 caractères maximum
- Conserver les émojis appropriés s'ils sont présents
- Ne pas ajouter de formules de politesse excessives
- Garder le message concis et direct
- Si le texte dépasse 160 caractères, le raccourcir intelligemment sans perdre le sens
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
        break;
      default:
        systemPrompt = `Tu es un assistant qui aide à reformuler et corriger du texte.
Corrige l'orthographe, la grammaire et améliore la clarté.
Réponds UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Veuillez réessayer dans quelques instants." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants. Veuillez recharger votre compte." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la reformulation" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const reformulatedText = data.choices?.[0]?.message?.content;

    if (!reformulatedText) {
      throw new Error("Aucun texte reformulé reçu de l'IA");
    }

    return new Response(
      JSON.stringify({ reformulatedText }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-reformulate-text function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
