import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getValidMobileSession } from "../_shared/mobileSavSession.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => null);
    const session = await getValidMobileSession(body?.token);
    if (!session) return json({ error: "Lien expiré ou invalide" }, 403);

    const m = typeof body?.image === "string" ? body.image.match(/^data:(image\/[a-z]+);base64,(.+)$/) : null;
    if (!m || !ALLOWED[m[1]]) return json({ error: "Image invalide (JPG, PNG, WebP)" }, 400);
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    if (bytes.length > 5 * 1024 * 1024) return json({ error: "Image trop lourde (5 Mo max)" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const path = `${session.shop_id}/sav-mobile_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ALLOWED[m[1]]}`;
    const { error } = await admin.storage.from("part-attachments").upload(path, bytes, { contentType: m[1] });
    if (error) { console.error("[mobile-sav-upload]", error); return json({ error: "Envoi de la photo impossible" }, 500); }
    return json({ path });
  } catch (e: any) {
    console.error("[mobile-sav-upload]", e);
    return json({ error: e?.message || "Erreur inconnue" }, 500);
  }
});
