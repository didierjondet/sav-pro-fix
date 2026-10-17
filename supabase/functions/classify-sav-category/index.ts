import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Category = 'Téléphones' | 'Informatique' | 'Consoles' | 'Tablettes' | 'Autres';

interface Item {
  id: string;
  brand?: string;
  model?: string;
  problem_description?: string;
}

const SYSTEM_PROMPT = `Tu es un classifieur d'appareils en atelier SAV. Pour chaque SAV, tu dois choisir UNE catégorie parmi :
- Téléphones (smartphones, iPhone, Galaxy, Redmi, etc.)
- Informatique (PC, portables, MacBook, iMac, tours, périphériques PC)
- Consoles (PS4/PS5, Xbox, Switch, manettes, Joy-Con)
- Tablettes (iPad, Galaxy Tab, Surface)
- Autres (tout le reste : bijouterie, électroménager, audio non-tel, vélo, etc.)

Tu t'appuies sur la marque, le modèle ET la description de la panne (ex: "écran iPhone cassé" → Téléphones ; "clavier ne répond plus" → Informatique).
Si aucun indice ne suggère un appareil des 4 premières catégories, réponds "Autres".
Ne renvoie QUE du JSON valide, aucun autre texte.`;

async function classifyBatch(items: Item[]): Promise<Record<string, Category>> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY manquant");

  const userPrompt = `Classe chacun des SAV suivants. Réponds UNIQUEMENT avec un JSON de la forme {"results":[{"id":"...","category":"..."}]}.

SAV à classer :
${JSON.stringify(items, null, 2)}`;

  const doFetch = async () => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  let res = await doFetch();
  if (res.status === 429 || res.status === 503) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await doFetch();
  }
  if (!res.ok) {
    const body = await res.text();
    console.error("[classify-sav-category] Gateway error", res.status, body);
    throw new Error(`Gateway ${res.status}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  const out: Record<string, Category> = {};
  const valid: Category[] = ['Téléphones', 'Informatique', 'Consoles', 'Tablettes', 'Autres'];
  for (const r of parsed?.results ?? []) {
    if (r?.id && valid.includes(r.category)) out[String(r.id)] = r.category;
  }
  return out;
}

async function classifyFamilies(items: Item[], families: { id: string; name: string }[]): Promise<Record<string, string>> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY manquant");
  const body = JSON.stringify({
    model: "openai/gpt-6-astra",
    stream: true,
    store: false,
    reasoning: { effort: "low" },
    instructions: "Tu classes des appareils en atelier SAV dans UNE des familles de produits du magasin, d'apres marque, modele et panne. Si rien ne correspond, choisis la famille la plus generique (ex: Autres). Reponds en JSON.",
    input: `Familles disponibles : ${JSON.stringify(families)}\nSAV : ${JSON.stringify(items)}`,
    text: { format: { type: "json_schema", name: "families", strict: true, schema: {
      type: "object", additionalProperties: false, required: ["results"],
      properties: { results: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "family_id"],
        properties: { id: { type: "string" }, family_id: { type: "string" } } } } },
    } } },
  });
  const doFetch = () => fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST", headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" }, body,
  });
  let res = await doFetch();
  if (res.status === 429 || res.status === 503) { await new Promise((r) => setTimeout(r, 2000)); res = await doFetch(); }
  if (!res.ok || !res.body) throw new Error(`Gateway ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try { const ev = JSON.parse(d); if (ev.type === "response.output_text.delta") text += ev.delta ?? ""; } catch { /* ignore */ }
    }
  }
  const parsed = JSON.parse(text || "{}");
  const ids = new Set(families.map((f) => f.id));
  const out: Record<string, string> = {};
  for (const r of parsed?.results ?? []) if (r?.id && ids.has(r.family_id)) out[String(r.id)] = r.family_id;
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { items, families } = await req.json() as { items?: Item[]; families?: { id: string; name: string }[] };
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ results: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (Array.isArray(families) && families.length > 0) {
      const fams = families.slice(0, 30).map((f) => ({ id: String(f.id), name: String(f.name).slice(0, 60) }));
      const capped = items.slice(0, 40).map((i) => ({
        id: String(i.id), brand: (i.brand || '').slice(0, 60), model: (i.model || '').slice(0, 80),
        problem_description: (i.problem_description || '').slice(0, 300),
      }));
      const results = await classifyFamilies(capped, fams);
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Limiter le lot (coût / latence)
    const capped = items.slice(0, 40).map((i) => ({
      id: String(i.id),
      brand: (i.brand || '').slice(0, 60),
      model: (i.model || '').slice(0, 80),
      problem_description: (i.problem_description || '').slice(0, 400),
    }));
    const results = await classifyBatch(capped);
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[classify-sav-category] error", e);
    return new Response(JSON.stringify({ results: {}, error: String(e) }), {
      status: 200, // ne casse pas les stats côté client
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
