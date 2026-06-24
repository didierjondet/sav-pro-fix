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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch local plans to enrich names
    const { data: localPlans } = await supabase
      .from("subscription_plans")
      .select("id, name, stripe_price_id, monthly_price, billing_interval");
    const localByPrice = new Map<string, any>();
    for (const p of localPlans ?? []) {
      if (p.stripe_price_id) localByPrice.set(p.stripe_price_id, p);
    }

    // Paginate subscriptions for active + trialing
    const subs: Stripe.Subscription[] = [];
    for (const status of ["active", "trialing"] as const) {
      let startingAfter: string | undefined;
      // safety cap
      for (let i = 0; i < 20; i++) {
        const page = await stripe.subscriptions.list({
          status,
          limit: 100,
          starting_after: startingAfter,
          expand: ["data.items.data.price.product"],
        });
        subs.push(...page.data);
        if (!page.has_more) break;
        startingAfter = page.data[page.data.length - 1]?.id;
        if (!startingAfter) break;
      }
    }
    log("subscriptions fetched", { count: subs.length });

    let monthly_revenue = 0;
    let annual_revenue = 0;
    const breakdown = new Map<
      string,
      {
        price_id: string;
        product_id: string;
        plan_name: string;
        monthly_price: number;
        interval: string;
        count: number;
        revenue: number;
      }
    >();

    for (const sub of subs) {
      for (const item of sub.items.data) {
        const price = item.price;
        const qty = item.quantity ?? 1;
        const unit = (price.unit_amount ?? 0) / 100;
        const amount = unit * qty;
        const interval = price.recurring?.interval ?? "month";

        if (interval === "year") {
          annual_revenue += amount;
        } else if (interval === "month") {
          monthly_revenue += amount;
        }

        const product = price.product as Stripe.Product | string;
        const productId = typeof product === "string" ? product : product.id;
        const productName =
          typeof product === "string" ? "" : product.name ?? "";
        const local = localByPrice.get(price.id);
        const planName =
          local?.name || productName || price.nickname || "Plan inconnu";

        const key = price.id;
        const existing = breakdown.get(key);
        if (existing) {
          existing.count += qty;
          existing.revenue += amount;
        } else {
          breakdown.set(key, {
            price_id: price.id,
            product_id: productId,
            plan_name: planName,
            monthly_price: interval === "year" ? unit / 12 : unit,
            interval,
            count: qty,
            revenue: amount,
          });
        }
      }
    }

    const plan_breakdown = Array.from(breakdown.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    const mrr = monthly_revenue + annual_revenue / 12;

    return new Response(
      JSON.stringify({
        mrr,
        monthly_revenue,
        annual_revenue,
        subscriber_count: subs.length,
        plan_breakdown,
        last_synced_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
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
