import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[SYNC-STRIPE-PRODUCT] ${step}`, details ? JSON.stringify(details) : "");
};

// Réplication Super Admin -> Stripe : la base reste la référence, Stripe est le miroir.
// Body: { kind: 'plan' | 'sms_package', id: string }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Seul un super_admin peut répliquer vers Stripe
    const { data: isSuperAdmin } = await supabaseClient.rpc("is_super_admin");
    if (!isSuperAdmin) throw new Error("Forbidden: super_admin only");
    logStep("Super admin verified", { userId: user.id });

    const { kind, id } = await req.json();
    if (!kind || !id || !["plan", "sms_package"].includes(kind)) {
      return new Response(JSON.stringify({ error: "Invalid body: kind ('plan'|'sms_package') and id required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    if (kind === "plan") {
      const { data: plan, error } = await supabaseClient
        .from("subscription_plans")
        .select("id, name, description, monthly_price, billing_interval, stripe_price_id, is_active, contact_only")
        .eq("id", id)
        .single();
      if (error || !plan) throw new Error("Plan not found");

      // Plans gratuits ou sur devis : pas de prix Stripe
      if (plan.contact_only || !plan.monthly_price || plan.monthly_price <= 0) {
        logStep("Plan without paid price, skipping Stripe sync", { planId: plan.id });
        return new Response(JSON.stringify({ skipped: true, reason: "free_or_contact_only" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const amountCents = Math.round(plan.monthly_price * 100);
      let stripePriceId = plan.stripe_price_id as string | null;
      let productId: string | null = null;

      if (stripePriceId) {
        // Vérifier le prix existant : Stripe ne permet pas de modifier le montant
        try {
          const existing = await stripe.prices.retrieve(stripePriceId);
          productId = existing.product as string;
          const sameAmount = existing.unit_amount === amountCents;
          const sameInterval = existing.recurring?.interval === (plan.billing_interval === "year" ? "year" : "month");
          if (!sameAmount || !sameInterval || !existing.active) {
            await stripe.prices.update(stripePriceId, { active: false });
            logStep("Old price archived", { stripePriceId });
            stripePriceId = null; // forcera la création d'un nouveau prix
          }
        } catch {
          stripePriceId = null;
        }
      }

      if (!stripePriceId) {
        if (!productId) {
          const product = await stripe.products.create({
            name: `Fixway — ${plan.name}`,
            description: plan.description || undefined,
          });
          productId = product.id;
          logStep("Product created", { productId });
        } else {
          await stripe.products.update(productId, {
            name: `Fixway — ${plan.name}`,
            description: plan.description || undefined,
          });
        }
        const price = await stripe.prices.create({
          product: productId,
          currency: "eur",
          unit_amount: amountCents,
          recurring: { interval: plan.billing_interval === "year" ? "year" : "month" },
        });
        stripePriceId = price.id;
        logStep("Price created", { stripePriceId });
      }

      await supabaseClient
        .from("subscription_plans")
        .update({ stripe_price_id: stripePriceId })
        .eq("id", plan.id);

      return new Response(JSON.stringify({ stripe_price_id: stripePriceId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // kind === 'sms_package'
    const { data: pack, error } = await supabaseClient
      .from("sms_packages")
      .select("id, name, description, sms_count, price_cents, stripe_price_id, is_active")
      .eq("id", id)
      .single();
    if (error || !pack) throw new Error("SMS package not found");

    if (!pack.price_cents || pack.price_cents <= 0) {
      logStep("Free package, skipping Stripe sync", { packageId: pack.id });
      return new Response(JSON.stringify({ skipped: true, reason: "free_package" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let stripePriceId = pack.stripe_price_id as string | null;
    let productId: string | null = null;

    if (stripePriceId) {
      try {
        const existing = await stripe.prices.retrieve(stripePriceId);
        productId = existing.product as string;
        if (existing.unit_amount !== pack.price_cents || !existing.active) {
          await stripe.prices.update(stripePriceId, { active: false });
          logStep("Old price archived", { stripePriceId });
          stripePriceId = null;
        }
      } catch {
        stripePriceId = null;
      }
    }

    if (!stripePriceId) {
      if (!productId) {
        const product = await stripe.products.create({
          name: `Fixway — ${pack.name}`,
          description: pack.description || `${pack.sms_count} crédits SMS supplémentaires pour Fixway`,
        });
        productId = product.id;
        logStep("Product created", { productId });
      } else {
        await stripe.products.update(productId, {
          name: `Fixway — ${pack.name}`,
          description: pack.description || `${pack.sms_count} crédits SMS supplémentaires pour Fixway`,
        });
      }
      const price = await stripe.prices.create({
        product: productId,
        currency: "eur",
        unit_amount: pack.price_cents,
      });
      stripePriceId = price.id;
      logStep("Price created", { stripePriceId });
    }

    await supabaseClient
      .from("sms_packages")
      .update({ stripe_price_id: stripePriceId })
      .eq("id", pack.id);

    return new Response(JSON.stringify({ stripe_price_id: stripePriceId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync-stripe-product", { message: errorMessage });
    const status = errorMessage.startsWith("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
