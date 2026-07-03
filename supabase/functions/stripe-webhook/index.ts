import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Réponse d'ignorance : 200 pour éviter les retries Stripe en boucle
const ignored = (reason: string, extra?: Record<string, unknown>) => {
  logStep("Event ignored (not Fixway)", { reason, ...extra });
  return new Response(JSON.stringify({ received: true, ignored: true, reason }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set — webhook signature verification is mandatory");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Vérification signature — si invalide, 400 (Stripe retentera normalement, comportement standard)
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logStep("Signature verification FAILED", { error: msg });
      return new Response(JSON.stringify({ error: `Invalid signature: ${msg}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    logStep("Webhook signature verified", { type: event.type, id: event.id });

    // Charger la liste blanche des price IDs Fixway depuis subscription_plans
    const { data: plans, error: plansErr } = await supabaseClient
      .from('subscription_plans')
      .select('stripe_price_id')
      .not('stripe_price_id', 'is', null);

    if (plansErr) {
      logStep("Failed to load Fixway price whitelist", { error: plansErr.message });
      throw new Error(`Cannot load Fixway price whitelist: ${plansErr.message}`);
    }
    const fixwayPriceIds = new Set(
      (plans ?? []).map((p: any) => p.stripe_price_id).filter(Boolean)
    );
    logStep("Fixway price whitelist loaded", { count: fixwayPriceIds.size });

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        if (!priceId || !fixwayPriceIds.has(priceId)) {
          return ignored('subscription_price_not_fixway', { priceId, subscriptionId: subscription.id });
        }
        await handleSubscriptionChange(supabaseClient, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSubscription = event.data.object as Stripe.Subscription;
        const priceId = deletedSubscription.items.data[0]?.price.id;
        if (!priceId || !fixwayPriceIds.has(priceId)) {
          return ignored('subscription_price_not_fixway', { priceId, subscriptionId: deletedSubscription.id });
        }
        await handleSubscriptionCancellation(supabaseClient, deletedSubscription);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'subscription') {
          // Récupérer les line items pour extraire le price ID
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
          const priceIds = lineItems.data.map((li) => li.price?.id).filter(Boolean) as string[];
          const isFixway = priceIds.some((id) => fixwayPriceIds.has(id));
          if (!isFixway) {
            return ignored('checkout_subscription_price_not_fixway', { sessionId: session.id, priceIds });
          }
          logStep("Fixway subscription checkout completed", { sessionId: session.id });
          // Les events subscription.created/updated gèrent la mise à jour DB
          break;
        }

        if (session.mode === 'payment') {
          // Les paiements Fixway one-shot = achats de packs SMS.
          // Signal Fixway = metadata.type + metadata.shop_id présent dans notre DB.
          const type = session.metadata?.type;
          const shopId = session.metadata?.shop_id;
          if (type !== 'sms_package_purchase' || !shopId) {
            return ignored('checkout_payment_not_fixway_metadata', { sessionId: session.id, type, shopId });
          }
          // Vérifier que le shop appartient bien à Fixway (existe dans notre DB)
          const { data: shop } = await supabaseClient
            .from('shops')
            .select('id')
            .eq('id', shopId)
            .maybeSingle();
          if (!shop) {
            return ignored('checkout_payment_shop_unknown', { sessionId: session.id, shopId });
          }
          await handleCheckoutCompleted(supabaseClient, stripe, session);
          break;
        }

        return ignored('checkout_mode_unsupported', { sessionId: session.id, mode: session.mode });
      }

      default:
        return ignored('event_type_unhandled', { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSubscriptionChange(supabaseClient: any, subscription: Stripe.Subscription) {
  logStep("Handling subscription change", {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status
  });

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  // Déterminer le tier via subscription_plans (source de vérité)
  let subscriptionTier = 'free';
  const priceId = subscription.items.data[0]?.price.id;
  if (priceId) {
    const { data: plan } = await supabaseClient
      .from('subscription_plans')
      .select('tier_key')
      .eq('stripe_price_id', priceId)
      .maybeSingle();
    if (plan?.tier_key) {
      subscriptionTier = plan.tier_key;
    }
  }

  const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const isActive = subscription.status === 'active';

  await supabaseClient.from("subscribers").upsert({
    stripe_customer_id: customerId,
    subscribed: isActive,
    subscription_tier: isActive ? subscriptionTier : 'free',
    subscription_end: isActive ? subscriptionEnd : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_customer_id' });

  await supabaseClient.from("shops").update({
    subscription_tier: isActive ? subscriptionTier : 'free',
    subscription_end: isActive ? subscriptionEnd : null,
    updated_at: new Date().toISOString(),
  }).eq('email', subscription.metadata?.user_email || '');

  logStep("Subscription updated in database", { tier: subscriptionTier, active: isActive });
}

async function handleSubscriptionCancellation(supabaseClient: any, subscription: Stripe.Subscription) {
  logStep("Handling subscription cancellation", { subscriptionId: subscription.id });

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  await supabaseClient.from("subscribers").update({
    subscribed: false,
    subscription_tier: 'free',
    subscription_end: null,
    updated_at: new Date().toISOString(),
  }).eq('stripe_customer_id', customerId);

  await supabaseClient.from("shops").update({
    subscription_tier: 'free',
    subscription_end: null,
    updated_at: new Date().toISOString(),
  }).eq('email', subscription.metadata?.user_email || '');

  logStep("Subscription cancelled in database");
}

async function handleCheckoutCompleted(supabaseClient: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  logStep("Handling checkout completion", { sessionId: session.id, mode: session.mode });

  const smsCount = parseInt(
    session.metadata?.sms_count || session.metadata?.sms_credits || '0'
  );
  const shopId = session.metadata?.shop_id;
  const purchaseType = session.metadata?.type;

  if (smsCount > 0 && shopId) {
    const { error: updateErr } = await supabaseClient
      .from('sms_package_purchases')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', session.id)
      .eq('status', 'pending');

    if (updateErr) {
      logStep("Error marking purchase completed", { error: updateErr.message });
    } else {
      logStep("Purchase marked completed", { sessionId: session.id });
    }

    const { data: shop } = await supabaseClient
      .from('shops')
      .select('sms_credits')
      .eq('id', shopId)
      .maybeSingle();

    if (shop) {
      await supabaseClient
        .from('shops')
        .update({
          sms_credits: (shop.sms_credits || 0) + smsCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopId);
      logStep("SMS credits added to shop", { shopId, credits: smsCount, type: purchaseType });
    }
  } else {
    logStep("Payment checkout without sms metadata — skipped", { metadata: session.metadata });
  }
}
