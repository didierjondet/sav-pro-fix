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

    const { smsPackage } = await req.json();
    if (!smsPackage) throw new Error("SMS package not specified");

    // Récupérer le shop et l'abonnement
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (profileError) throw profileError;

    const { data: shopData, error: shopError } = await supabaseClient
      .from('shops')
      .select('subscription_tier')
      .eq('id', profileData.shop_id)
      .single();

    if (shopError) throw shopError;

    // Définir les prix selon l'abonnement
    const smsPrices = {
      free: {
        pack_100: { amount: 1500, credits: 100 }, // 15€ pour 100 SMS
        pack_500: { amount: 6000, credits: 500 }, // 60€ pour 500 SMS
        pack_1000: { amount: 10000, credits: 1000 } // 100€ pour 1000 SMS
      },
      premium: {
        pack_100: { amount: 1200, credits: 100 }, // 12€ pour 100 SMS  
        pack_500: { amount: 5000, credits: 500 }, // 50€ pour 500 SMS
        pack_1000: { amount: 8000, credits: 1000 } // 80€ pour 1000 SMS
      },
      enterprise: {
        pack_100: { amount: 1000, credits: 100 }, // 10€ pour 100 SMS
        pack_500: { amount: 4000, credits: 500 }, // 40€ pour 500 SMS
        pack_1000: { amount: 6000, credits: 1000 } // 60€ pour 1000 SMS
      }
    };

    const tier = shopData.subscription_tier as keyof typeof smsPrices;
    const packageData = smsPrices[tier]?.[smsPackage as keyof typeof smsPrices[typeof tier]];
    
    if (!packageData) {
      throw new Error("Invalid SMS package for subscription tier");
    }

    logStep("Package selected", { tier, smsPackage, packageData });

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
              name: `Pack ${packageData.credits} SMS`,
              description: `Crédits SMS pour votre magasin - Plan ${tier}`
            },
            unit_amount: packageData.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/settings?tab=sms&success=true`,
      cancel_url: `${req.headers.get("origin")}/settings?tab=sms&cancelled=true`,
      metadata: {
        type: "sms_purchase",
        shop_id: profileData.shop_id,
        sms_credits: packageData.credits.toString(),
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