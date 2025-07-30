import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    let event: Stripe.Event;
    
    if (webhookSecret && signature) {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { type: event.type });
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
      logStep("Webhook parsed (no signature verification)", { type: event.type });
    }

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

  // Déterminer le tier basé sur le montant
  let subscriptionTier = 'free';
  const amount = subscription.items.data[0]?.price.unit_amount || 0;
  
  if (amount >= 4000) { // 40€ ou plus
    subscriptionTier = 'enterprise';
  } else if (amount >= 1200) { // 12€ ou plus
    subscriptionTier = 'premium';
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
  logStep("Handling checkout completion", { sessionId: session.id });

  if (session.mode === 'payment') {
    // C'est un achat de SMS one-time
    const smsCredits = parseInt(session.metadata?.sms_credits || '0');
    const shopId = session.metadata?.shop_id;
    
    if (smsCredits && shopId) {
      // Ajouter les crédits SMS
      const { data: shop } = await supabaseClient
        .from('shops')
        .select('sms_credits')
        .eq('id', shopId)
        .single();

      if (shop) {
        await supabaseClient
          .from('shops')
          .update({
            sms_credits: (shop.sms_credits || 0) + smsCredits,
            updated_at: new Date().toISOString()
          })
          .eq('id', shopId);

        logStep("SMS credits added", { shopId, credits: smsCredits });
      }
    }
  } else if (session.mode === 'subscription') {
    // C'est un abonnement - sera géré par les events subscription
    logStep("Subscription checkout completed", { sessionId: session.id });
  }
}