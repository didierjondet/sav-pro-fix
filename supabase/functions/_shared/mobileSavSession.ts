import { createClient } from "npm:@supabase/supabase-js@2";

/** Renvoie le shop_id d'une session mobile valide (non soumise, non expirée), sinon null. */
export async function getValidMobileSession(token: unknown): Promise<{ id: string; shop_id: string } | null> {
  if (typeof token !== "string" || !/^[a-f0-9]{20,64}$/.test(token)) return null;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await admin
    .from("mobile_sav_sessions")
    .select("id, shop_id, status, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.status === "submitted" || data.status === "expired") return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return { id: data.id, shop_id: data.shop_id };
}
