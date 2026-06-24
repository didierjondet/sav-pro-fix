import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPGRADE-SUBSCRIPTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetPlan } = await req.json();
    logStep("Function started", { targetPlan });

    if (!targetPlan || !['premium', 'enterprise'].includes(targetPlan)) {
      return new Response(JSON.stringify({ error: "Plan invalide (premium ou enterprise attendu)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Récupérer dynamiquement le price_id depuis la BDD
    const { data: planData, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('id, tier_key, stripe_price_id, monthly_price')
      .eq('tier_key', targetPlan)
      .eq('is_active', true)
      .maybeSingle();

    if (planError) throw new Error(`Plan lookup error: ${planError.message}`);
    if (!planData) {
      return new Response(JSON.stringify({ error: `Plan '${targetPlan}' introuvable ou inactif` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!planData.stripe_price_id) {
      return new Response(JSON.stringify({ error: `Le plan '${targetPlan}' n'a pas de stripe_price_id configuré` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const priceId = planData.stripe_price_id;
    logStep("Plan loaded from DB", { planId: planData.id, priceId });

    // Vérifier le client Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found");
    const customerId = customers.data[0].id;

    // Vérifier l'abonnement actuel
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const origin = req.headers.get("origin") || "https://sav-pro-fix.lovable.app";

    if (subscriptions.data.length === 0) {
      // Pas d'abonnement - créer nouveau checkout
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/settings?upgraded=true`,
        cancel_url: `${origin}/settings?cancelled=true`,
        metadata: {
          user_id: user.id,
          user_email: user.email,
          plan: targetPlan,
          plan_id: planData.id,
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            user_email: user.email,
            plan: targetPlan,
            plan_id: planData.id,
          },
        },
      });
      logStep("Checkout session created", { sessionId: session.id });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Upgrade abonnement existant
      const subscription = subscriptions.data[0];
      await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: priceId,
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          user_id: user.id,
          user_email: user.email,
          plan: targetPlan,
          plan_id: planData.id,
        },
      });
      logStep("Subscription updated", { subscriptionId: subscription.id });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
