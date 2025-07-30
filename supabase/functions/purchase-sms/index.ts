import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-SMS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
    if (userError) throw userError;
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { credits } = await req.json();
    logStep("Request body parsed", { credits });

    if (!credits || typeof credits !== 'number' || credits <= 0) {
      throw new Error('Nombre de crédits SMS invalide');
    }

    // Get user's shop and subscription tier
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profileData?.shop_id) {
      throw new Error('Profil utilisateur introuvable');
    }

    const { data: shopData, error: shopError } = await supabaseClient
      .from('shops')
      .select('subscription_tier')
      .eq('id', profileData.shop_id)
      .single();

    if (shopError || !shopData) {
      throw new Error('Magasin introuvable');
    }

    logStep("Shop data retrieved", { shopId: profileData.shop_id, subscriptionTier: shopData.subscription_tier });

    // Récupérer le prix SMS depuis les plans d'abonnement
    const { data: planData, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('sms_cost')
      .eq('name', shopData.subscription_tier === 'free' ? 'Gratuit' : 
                  shopData.subscription_tier === 'premium' ? 'Premium' : 'Enterprise')
      .single();

    let pricePerSMS = 0.12; // Prix par défaut pour free
    if (planData?.sms_cost) {
      pricePerSMS = planData.sms_cost;
    } else {
      // Fallback sur les anciens prix si la table n'existe pas encore
      pricePerSMS = shopData.subscription_tier === 'enterprise' ? 0.05 : 
                   shopData.subscription_tier === 'premium' ? 0.08 : 0.12;
    }

    const totalPrice = Math.ceil(credits * pricePerSMS * 100); // Total price in cents
    logStep("Pricing calculated", { pricePerSMS, totalPrice, credits });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Vérifier/créer client Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    logStep("Stripe customer", { customerId });

    // Créer session de paiement
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: `Pack ${credits} SMS`,
              description: `Crédits SMS pour votre magasin - Plan ${shopData.subscription_tier}`
            },
            unit_amount: totalPrice, // Price in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/sms-purchase-success?credits=${credits}`,
      cancel_url: `${req.headers.get("origin")}/settings?tab=sms&cancelled=true`,
      metadata: {
        type: "sms_purchase",
        shop_id: profileData.shop_id,
        sms_credits: credits.toString(),
        user_id: user.id
      }
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});