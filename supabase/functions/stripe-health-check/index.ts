import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[STRIPE-HEALTH-CHECK] ${step}`, details ?? "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result: any = {
      stripe_key_present: !!stripeKey,
      webhook_secret_present: !!webhookSecret,
      mode: null,
      account: null,
      account_error: null,
      prices: [] as any[],
      checked_at: new Date().toISOString(),
    };

    if (!stripeKey) {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    result.mode = stripeKey.startsWith("sk_live_") ? "live" : stripeKey.startsWith("sk_test_") ? "test" : "unknown";

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    try {
      const acct = await stripe.accounts.retrieve();
      result.account = {
        id: acct.id,
        email: acct.email ?? null,
        business_name: (acct as any).business_profile?.name ?? acct.settings?.dashboard?.display_name ?? null,
        country: acct.country ?? null,
        charges_enabled: acct.charges_enabled,
        payouts_enabled: acct.payouts_enabled,
      };
    } catch (e: any) {
      result.account_error = e?.message ?? String(e);
    }

    // Check each active plan's price exists in Stripe
    const { data: plans } = await supabase
      .from("subscription_plans")
      .select("id, name, tier_key, stripe_price_id, monthly_price, billing_interval, is_active")
      .eq("is_active", true);

    for (const p of plans ?? []) {
      const entry: any = {
        plan_id: p.id,
        plan_name: p.name,
        tier_key: p.tier_key,
        local_monthly_price: p.monthly_price,
        local_interval: p.billing_interval,
        stripe_price_id: p.stripe_price_id,
        valid: false,
        stripe_amount: null,
        stripe_interval: null,
        stripe_currency: null,
        error: null as string | null,
      };
      if (!p.stripe_price_id) {
        entry.error = "Aucun stripe_price_id configuré";
      } else {
        try {
          const price = await stripe.prices.retrieve(p.stripe_price_id);
          entry.valid = price.active;
          entry.stripe_amount = (price.unit_amount ?? 0) / 100;
          entry.stripe_interval = price.recurring?.interval ?? null;
          entry.stripe_currency = price.currency;
          if (!price.active) entry.error = "Prix Stripe inactif";
        } catch (e: any) {
          entry.error = e?.message ?? String(e);
        }
      }
      result.prices.push(entry);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
