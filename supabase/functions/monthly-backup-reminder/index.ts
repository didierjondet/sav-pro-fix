import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isLastDayOfMonth(date = new Date()) {
  const d = new Date(date);
  const tomorrow = new Date(d);
  tomorrow.setDate(d.getDate() + 1);
  return tomorrow.getDate() === 1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (!isLastDayOfMonth()) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not last day of month' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const now = new Date();
    // Start of current month (UTC)
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    // Shops must have been created at least 30 days ago
    const cutoffCreated = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, name')
      .lt('created_at', cutoffCreated);
    if (shopsError) throw shopsError;

    const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const title = `Rappel sauvegarde – ${monthLabel}`;
    const message = "Pensez à sauvegarder vos SAV et Devis du mois. Ouvrir l'export ici: /settings?tab=import-export";

    const inserts: Array<{ shop_id: string; title: string; message: string; type: 'general'; read: boolean }> = [];

    for (const s of shops ?? []) {
      // Check if shop has any SAV or quote created in the current month
      const [{ count: savCount }, { count: quoteCount }] = await Promise.all([
        supabase
          .from('sav_cases')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', s.id)
          .gte('created_at', monthStart),
        supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', s.id)
          .gte('created_at', monthStart),
      ]);

      if ((savCount ?? 0) > 0 || (quoteCount ?? 0) > 0) {
        inserts.push({
          shop_id: s.id,
          title,
          message,
          type: 'general',
          read: false,
        });
      }
    }

    if (inserts.length > 0) {
      const { error: notifErr } = await supabase.from('notifications').insert(inserts);
      if (notifErr) throw notifErr;
    }

    return new Response(JSON.stringify({ success: true, eligible: shops?.length || 0, created: inserts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
