import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-STRIPE-PRICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY is not set");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("Stripe key verified");

    const { price_id, plan_id } = await req.json();
    logStep("Request data received", { price_id, plan_id });

    if (!price_id) {
      logStep("ERROR: No price_id provided");
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Price ID is required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe client initialized");

    try {
      // Vérifier si le Price ID existe et récupérer ses informations
      logStep("Retrieving price from Stripe", { price_id });
      const price = await stripe.prices.retrieve(price_id);
      logStep("Price retrieved successfully", { 
        id: price.id, 
        amount: price.unit_amount, 
        currency: price.currency,
        interval: price.recurring?.interval
      });

      // Vérifier que c'est bien un prix récurrent (abonnement)
      if (!price.recurring) {
        logStep("ERROR: Price is not recurring");
        return new Response(JSON.stringify({ 
          valid: false, 
          error: "Ce Price ID n'est pas un abonnement récurrent" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Price validation successful", {
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring.interval,
        active: price.active
      });

      return new Response(JSON.stringify({
        valid: true,
        price_id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring.interval,
        active: price.active,
        product_id: price.product
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeError: any) {
      logStep("Stripe API error", { 
        error: stripeError.message, 
        code: stripeError.code,
        type: stripeError.type 
      });

      if (stripeError.code === 'resource_missing') {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: `Price ID '${price_id}' n'existe pas dans Stripe` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        valid: false, 
        error: `Erreur Stripe: ${stripeError.message}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-stripe-price", { message: errorMessage });
    return new Response(JSON.stringify({ 
      valid: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});