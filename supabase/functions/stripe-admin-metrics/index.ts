import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[STRIPE-ADMIN-METRICS] ${step}`, details ?? "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----- Allowlist Fixway : on ne regarde QUE nos price IDs -----
    const { data: localPlans } = await supabase
      .from("subscription_plans")
      .select("id, name, tier_key, stripe_price_id, monthly_price, billing_interval");

    const localByPrice = new Map<string, any>();
    for (const p of localPlans ?? []) {
      if (p.stripe_price_id) localByPrice.set(p.stripe_price_id, p);
    }
    const fixwayPriceIds = new Set(localByPrice.keys());

    if (fixwayPriceIds.size === 0) {
      log("no fixway price configured");
      return new Response(
        JSON.stringify({
          configured: false,
          message:
            "Aucun price Stripe Fixway configuré dans les plans d'abonnement.",
          mrr: 0,
          monthly_revenue: 0,
          annual_revenue: 0,
          subscriber_count: 0,
          plan_breakdown: [],
          revenue_30d: 0,
          revenue_12m: 0,
          last_synced_at: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ----- Souscriptions actives + trialing -----
    const subs: Stripe.Subscription[] = [];
    for (const status of ["active", "trialing"] as const) {
      let startingAfter: string | undefined;
      for (let i = 0; i < 20; i++) {
        const page = await stripe.subscriptions.list({
          status,
          limit: 100,
          starting_after: startingAfter,
          expand: ["data.items.data.price"],
        });
        subs.push(...page.data);
        if (!page.has_more) break;
        startingAfter = page.data[page.data.length - 1]?.id;
        if (!startingAfter) break;
      }
    }
    log("subscriptions fetched (raw)", { count: subs.length });

    let monthly_revenue = 0;
    let annual_revenue = 0;
    let subscriber_count = 0;
    const breakdown = new Map<
      string,
      {
        price_id: string;
        plan_name: string;
        monthly_price: number;
        interval: string;
        count: number;
        revenue: number;
      }
    >();

    for (const sub of subs) {
      let hasFixwayItem = false;
      for (const item of sub.items.data) {
        const price = item.price;
        if (!fixwayPriceIds.has(price.id)) continue; // FILTRE STRICT
        hasFixwayItem = true;

        const qty = item.quantity ?? 1;
        const unit = (price.unit_amount ?? 0) / 100;
        const amount = unit * qty;
        const interval = price.recurring?.interval ?? "month";

        if (interval === "year") annual_revenue += amount;
        else if (interval === "month") monthly_revenue += amount;

        const local = localByPrice.get(price.id);
        const planName = local?.name || price.nickname || "Plan Fixway";

        const existing = breakdown.get(price.id);
        if (existing) {
          existing.count += qty;
          existing.revenue += amount;
        } else {
          breakdown.set(price.id, {
            price_id: price.id,
            plan_name: planName,
            monthly_price: interval === "year" ? unit / 12 : unit,
            interval,
            count: qty,
            revenue: amount,
          });
        }
      }
      if (hasFixwayItem) subscriber_count++;
    }

    const plan_breakdown = Array.from(breakdown.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );
    const mrr = monthly_revenue + annual_revenue / 12;

    // ----- CA encaissé (invoices payées) filtré ligne par ligne -----
    const now = Math.floor(Date.now() / 1000);
    const since30d = now - 30 * 24 * 3600;
    const since12m = now - 365 * 24 * 3600;

    const sumPaidInvoices = async (gte: number) => {
      let total = 0;
      let startingAfter: string | undefined;
      for (let i = 0; i < 20; i++) {
        const page = await stripe.invoices.list({
          status: "paid",
          limit: 100,
          created: { gte },
          starting_after: startingAfter,
        });
        for (const inv of page.data) {
          for (const line of inv.lines.data) {
            const lpid = line.price?.id;
            if (lpid && fixwayPriceIds.has(lpid)) {
              total += (line.amount ?? 0) / 100;
            }
          }
        }
        if (!page.has_more) break;
        startingAfter = page.data[page.data.length - 1]?.id;
        if (!startingAfter) break;
      }
      return total;
    };

    const revenue_30d = await sumPaidInvoices(since30d);
    const revenue_12m = await sumPaidInvoices(since12m);

    return new Response(
      JSON.stringify({
        configured: true,
        mrr,
        monthly_revenue,
        annual_revenue,
        subscriber_count,
        plan_breakdown,
        revenue_30d,
        revenue_12m,
        last_synced_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
