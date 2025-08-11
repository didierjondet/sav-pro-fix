import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetPlan } = await req.json();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

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

    const origin = req.headers.get("origin") || "https://your-domain.com";
    
    if (subscriptions.data.length === 0) {
      // Pas d'abonnement - créer nouveau checkout
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: getPriceId(targetPlan), quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/settings?upgraded=true`,
        cancel_url: `${origin}/settings?cancelled=true`,
      });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Upgrade abonnement existant
      const subscription = subscriptions.data[0];
      await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: getPriceId(targetPlan),
        }],
        proration_behavior: 'create_prorations',
      });
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function getPriceId(plan: string): string {
  const priceIds = {
    premium: "price_premium_id",
    enterprise: "price_enterprise_id"
  };
  return priceIds[plan] || priceIds.premium;
}