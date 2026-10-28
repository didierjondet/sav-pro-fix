import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getValidMobileSession } from "../_shared/mobileSavSession.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Miroir de src/lib/mobileDocs.ts
const MB = 1024 * 1024;
const ALLOWED: Record<string, { ext: string; max: number }> = {
  "image/jpeg": { ext: "jpg", max: 5 * MB },
  "image/png": { ext: "png", max: 5 * MB },
  "image/webp": { ext: "webp", max: 5 * MB },
  "application/pdf": { ext: "pdf", max: 10 * MB },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => null);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Retour de prêt (QR du document de restitution) : jeton propre au prêt
    let loanShop: string | null = null;
    if (typeof body?.loan_token === "string") {
      const { data } = await admin.rpc("loaner_return_shop", { p_token: body.loan_token });
      loanShop = (data as string) || null;
      if (!loanShop) return json({ error: "Lien invalide ou matériel déjà restitué" }, 403);
    }
    const session = loanShop ? null : await getValidMobileSession(body?.token);
    if (!loanShop && !session) return json({ error: "Lien expiré ou invalide" }, 403);

    const raw = typeof body?.file === "string" ? body.file : body?.image;
    const m = typeof raw === "string" ? raw.match(/^data:([a-z]+\/[a-z]+);base64,(.+)$/) : null;
    const rule = m ? ALLOWED[m[1]] : undefined;
    if (loanShop && m?.[1] === "application/pdf") return json({ error: "Photos uniquement" }, 400);
    if (!m || !rule) return json({ error: "Format non accepté (JPG, PNG, WebP ou PDF)" }, 400);
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    if (bytes.length > rule.max) return json({ error: m[1] === "application/pdf" ? "PDF trop lourd (10 Mo max)" : "Image trop lourde (5 Mo max)" }, 400);

    if (loanShop) {
      const p = `${loanShop}/loaner-return_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${rule.ext}`;
      const { error } = await admin.storage.from("part-attachments").upload(p, bytes, { contentType: m[1] });
      if (error) { console.error("[mobile-sav-upload]", error); return json({ error: "Envoi du fichier impossible" }, 500); }
      return json({ path: `sav:${p}` });
    }
    const path = `${session!.shop_id}/sav-mobile_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${rule.ext}`;
    const { error } = await admin.storage.from("part-attachments").upload(path, bytes, { contentType: m[1] });
    if (error) { console.error("[mobile-sav-upload]", error); return json({ error: "Envoi du fichier impossible" }, 500); }

    // Mode « documents » : on ajoute le fichier à la session pour que l'ordinateur le reçoive en direct
    if (body?.append === true) {
      const { data: s } = await admin.from("mobile_sav_sessions").select("payload").eq("id", session!.id).maybeSingle();
      const payload = (s?.payload && typeof s.payload === "object") ? s.payload as Record<string, unknown> : {};
      const photos = Array.isArray(payload.photos) ? payload.photos : [];
      if (photos.length >= 30) return json({ error: "30 fichiers maximum" }, 400);
      await admin.from("mobile_sav_sessions").update({ payload: { ...payload, photos: [...photos, path] } }).eq("id", session!.id);
    }
    return json({ path });
  } catch (e: any) {
    console.error("[mobile-sav-upload]", e);
    return json({ error: e?.message || "Erreur inconnue" }, 500);
  }
});
