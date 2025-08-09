import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isLastDayOfMonth(date = new Date()) {
  const d = new Date(date);
  const tomorrow = new Date(d);
  tomorrow.setDate(d.getDate() + 1);
  return tomorrow.getDate() === 1; // demain = 1 => aujourd'hui = dernier jour du mois
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Ne créer la notification qu'en fin de mois
    if (!isLastDayOfMonth()) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not last day of month' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Récupérer toutes les boutiques
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, name');
    if (shopsError) throw shopsError;

    const title = 'Rappel sauvegarde de fin de mois';
    const message = "Pensez à sauvegarder vos SAV et Devis. Ouvrir l'export ici: /settings?tab=import-export";

    // Insérer une notification par boutique
    if (shops && shops.length > 0) {
      const inserts = shops.map((s) => ({
        shop_id: s.id,
        title,
        message,
        type: 'general' as const,
        read: false,
      }));

      const { error: notifErr } = await supabase.from('notifications').insert(inserts);
      if (notifErr) throw notifErr;
    }

    return new Response(JSON.stringify({ success: true, created: shops?.length || 0 }), {
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