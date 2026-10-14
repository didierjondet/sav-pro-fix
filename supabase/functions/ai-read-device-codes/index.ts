import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    imei: { type: ["string", "null"] },
    serial: { type: ["string", "null"] },
    sku: { type: ["string", "null"] },
  },
  required: ["imei", "serial", "sku"],
};

const PROMPT = `Lis l'étiquette / l'écran photographié d'un appareil électronique et extrais exactement :
- imei : IMEI (15 chiffres) s'il est visible, sinon null (si deux IMEI, prends IMEI1)
- serial : numéro de série (S/N, Serial No.) s'il est visible, sinon null
- sku : référence produit / SKU / Model No. / EAN s'il est visible, sinon null
Recopie caractère par caractère sans espaces, en majuscules. N'invente rien.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: authErr } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (authErr || !claims?.claims?.sub) return json({ error: "Non authentifié" }, 401);

    const body = await req.json().catch(() => null);
    const image = body?.image;
    if (typeof image !== "string" || !image.startsWith("data:image/") || image.length > 8_000_000) {
      return json({ error: "Image invalide" }, 400);
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Configuration IA manquante" }, 500);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: PROMPT },
            { type: "input_image", image_url: image },
          ],
        }],
        text: { format: { type: "json_schema", name: "device_codes", strict: true, schema: SCHEMA } },
      }),
    });

    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      console.error("[ai-read-device-codes]", res.status, t.slice(0, 300));
      if (res.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
      if (res.status === 429) return json({ error: "Trop de demandes IA, réessayez dans un instant." }, 429);
      return json({ error: "Lecture IA indisponible, saisissez le code à la main." }, res.status >= 500 ? 502 : res.status);
    }

    // Lecture du flux SSE
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") out += ev.delta;
        } catch { /* ignore */ }
      }
    }

    let parsed: any = {};
    try { parsed = JSON.parse(out); } catch { return json({ error: "Aucun code lisible sur la photo." }, 422); }
    const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.replace(/\s/g, "").toUpperCase() : null);
    return json({ imei: clean(parsed.imei), serial: clean(parsed.serial), sku: clean(parsed.sku) });
  } catch (e: any) {
    console.error("[ai-read-device-codes]", e);
    return json({ error: e?.message || "Erreur inconnue" }, 500);
  }
});
