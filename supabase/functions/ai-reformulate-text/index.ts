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
        systemPrompt = `Tu es un assistant expert en réparation qui aide à reformuler les descriptions de problèmes pour les rendre claires, professionnelles et compréhensibles pour les clients. 
Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Structurer le texte de manière claire
- Garder un ton professionnel mais accessible
- Ne pas inventer de détails techniques non mentionnés
- Garder les informations essentielles du texte original
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
        break;
      case "repair_notes":
        systemPrompt = `Tu es un technicien expert qui aide à reformuler les notes de réparation pour qu'elles soient claires, précises et professionnelles.
Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Organiser les informations de manière logique
- Utiliser un vocabulaire technique approprié mais compréhensible
- Détailler les interventions effectuées
- Répondre UNIQUEMENT avec le texte reformulé, sans commentaire ni introduction`;
        break;
      case "technician_comments":
        systemPrompt = `Tu es un technicien expert qui aide à reformuler les commentaires destinés aux clients de manière professionnelle et rassurante.
Ton rôle est de :
- Corriger l'orthographe et la grammaire
- Adopter un ton professionnel et bienveillant
- Expliquer clairement les recommandations
- Éviter le jargon technique trop complexe
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
