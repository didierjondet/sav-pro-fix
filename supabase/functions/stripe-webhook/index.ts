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
      throw new Error("Missing stripe-signature header");
    }

    const event: Stripe.Event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Webhook signature verified", { type: event.type });

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabaseClient, subscription);
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancellation(supabaseClient, deletedSubscription);
        break;
        
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabaseClient, stripe, session);
        break;
        
      default:
        logStep("Unhandled event type", { type: event.type });
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

  // Récupérer le customer
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;

  // Déterminer le tier en cherchant le plan par stripe_price_id (source de vérité = tier_key)
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
    } else {
      // Fallback amount-based aligné sur les prix réels (49€ premium, 79€ enterprise)
      const amount = subscription.items.data[0]?.price.unit_amount || 0;
      if (amount >= 7900) subscriptionTier = 'enterprise';
      else if (amount >= 4900) subscriptionTier = 'premium';
    }
  }

  const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const isActive = subscription.status === 'active';

  // Mettre à jour dans subscribers
  await supabaseClient.from("subscribers").upsert({
    stripe_customer_id: customerId,
    subscribed: isActive,
    subscription_tier: isActive ? subscriptionTier : 'free',
    subscription_end: isActive ? subscriptionEnd : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_customer_id' });

  // Mettre à jour dans shops aussi
  await supabaseClient.from("shops").update({
    subscription_tier: isActive ? subscriptionTier : 'free',
    subscription_end: isActive ? subscriptionEnd : null,
    updated_at: new Date().toISOString(),
  }).eq('email', subscription.metadata?.user_email || '');

  logStep("Subscription updated in database", { 
    tier: subscriptionTier, 
    active: isActive 
  });
}

async function handleSubscriptionCancellation(supabaseClient: any, subscription: Stripe.Subscription) {
  logStep("Handling subscription cancellation", { subscriptionId: subscription.id });

  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;

  // Remettre en plan free
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

  if (session.mode === 'payment') {
    // Lecture des metadata (alignée sur purchase-sms-package : sms_count, pas sms_credits)
    const smsCount = parseInt(
      session.metadata?.sms_count || session.metadata?.sms_credits || '0'
    );
    const shopId = session.metadata?.shop_id;
    const purchaseType = session.metadata?.type;

    if (smsCount > 0 && shopId) {
      // 1) Marquer l'achat comme completed dans sms_package_purchases
      //    (purchase-sms-package stocke session.id dans stripe_payment_intent_id)
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

      // 2) Créditer le shop (sms_credits column si elle existe — sinon ignoré silencieusement)
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
  } else if (session.mode === 'subscription') {
    // C'est un abonnement - sera géré par les events subscription.created/updated
    logStep("Subscription checkout completed", { sessionId: session.id });
  }
}
