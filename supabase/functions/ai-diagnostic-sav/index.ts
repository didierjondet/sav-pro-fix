import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SavContext {
  problem_description?: string;
  device_brand?: string;
  device_model?: string;
  sav_type?: string;
}

const SYSTEM_PROMPT_INITIAL = `Tu es un technicien senior expert en réparation d'appareils électroniques (smartphones, tablettes, consoles, ordinateurs).

À partir d'une description de panne fournie par le collègue en atelier, tu produis une analyse claire et actionnable en **français**, au format **markdown**, structurée EXACTEMENT ainsi :

## Causes possibles
- **Cause 1** : explication courte
- **Cause 2** : explication courte
- (3 à 6 causes, classées de la plus probable à la moins probable)

## Pistes de vérification
1. Test / vérification concret à faire
2. ...

## Solutions de réparation
- **Solution pour cause X** : étapes concrètes, pièces à prévoir
- ...

Sois factuel, concis, orienté atelier. N'invente pas de références produit. Si l'information est insuffisante, dis-le clairement à la fin dans une section "## Informations manquantes".`;

const SYSTEM_PROMPT_CHAT = `Tu es un technicien senior expert en réparation d'appareils électroniques. Tu assistes un collègue technicien sur un dossier SAV précis. Réponds en français, de manière concise et technique, en markdown. Base-toi sur le contexte du SAV fourni et l'historique de la conversation. Si le technicien joint des photos ou vidéos de l'appareil, analyse-les visuellement (casse, oxydation, connecteurs, écran, traces de chocs) et appuie ton diagnostic dessus.`;

type Attachment = { url: string; type?: string; name?: string };

// Construit un contenu multimodal (texte + images/vidéos) pour le gateway IA
function buildContent(text: string, attachments?: Attachment[]): any {
  if (!attachments || attachments.length === 0) return text;
  const blocks: any[] = [{ type: "text", text: text || "Analyse les médias joints." }];
  for (const att of attachments) {
    if (!att?.url) continue;
    const mime = att.type || "";
    if (mime.startsWith("video/")) {
      blocks.push({ type: "video_url", video_url: { url: att.url } });
    } else if (mime.startsWith("image/")) {
      blocks.push({ type: "image_url", image_url: { url: att.url } });
    }
  }
  return blocks;
}

async function callLovableAI(messages: any[], maxTokens = 1200): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY manquant");

  const doFetch = async () => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      max_tokens: maxTokens,
    }),
  });

  let res = await doFetch();
  if (res.status === 429 || res.status === 503) {
    await new Promise((r) => setTimeout(r, 2000));
    res = await doFetch();
  }

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("Limite de requêtes IA atteinte, réessayez dans quelques instants.");
    if (res.status === 402) throw new Error("Crédits IA épuisés. Rechargez les crédits Lovable AI.");
    throw new Error(`Erreur IA (${res.status}): ${body.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Aucune réponse IA reçue");
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const mode: "initial" | "chat" = body.mode || "initial";
    const savContext: SavContext = body.savContext || {};

    const contextBlock = `Contexte du dossier SAV :
- Appareil : ${savContext.device_brand || "?"} ${savContext.device_model || ""}
- Type de SAV : ${savContext.sav_type || "?"}
- Description de la panne : ${savContext.problem_description || "(non fournie)"}`;

    const hasMedia = Array.isArray(body.attachments) && body.attachments.length > 0;

    if (mode === "initial") {
      const text = await callLovableAI([
        { role: "system", content: SYSTEM_PROMPT_INITIAL + (hasMedia ? "\n\nDes photos et/ou vidéos de l'appareil sont jointes : analyse-les visuellement (casse, oxydation, connecteurs, écran, traces de chocs) et intègre ces constats dans ton analyse." : "") },
        { role: "user", content: buildContent(contextBlock, body.attachments) },
      ], 1500);
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat mode
    const rawHistory: { role: string; content: string; attachments?: Attachment[] }[] = body.messages || [];
    const history = rawHistory.map((m) => ({
      role: m.role,
      content: m.role === "user" ? buildContent(m.content, m.attachments) : m.content,
    }));
    const text = await callLovableAI([
      { role: "system", content: SYSTEM_PROMPT_CHAT },
      { role: "system", content: contextBlock },
      ...history,
    ], 1000);

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[AI-DIAGNOSTIC-SAV]", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erreur inconnue" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
