import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-SMS-PACKAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Utiliser la clé service pour les écritures
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
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Récupérer le shop_id de l'utilisateur
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profileData?.shop_id) {
      throw new Error("User shop not found");
    }

    const { packageId } = await req.json();
    if (!packageId) throw new Error("Package ID is required");

    logStep("Fetching SMS package", { packageId });

    // Récupérer les détails du package
    const { data: packageData, error: packageError } = await supabaseClient
      .from('sms_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (packageError || !packageData) {
      throw new Error("SMS package not found or inactive");
    }

    logStep("Package found", { package: packageData });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Vérifier si le client existe déjà
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    logStep("Creating checkout session");

    const origin = req.headers.get("origin") || "https://your-domain.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: packageData.name,
              description: packageData.description || `${packageData.sms_count} SMS supplémentaires`,
            },
            unit_amount: packageData.price_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/settings?tab=sms&success=true`,
      cancel_url: `${origin}/settings?tab=sms&cancelled=true`,
      metadata: {
        shop_id: profileData.shop_id,
        package_id: packageId,
        sms_count: packageData.sms_count.toString(),
        type: 'sms_package_purchase'
      }
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Enregistrer l'achat en attente
    const { error: purchaseError } = await supabaseClient
      .from('sms_package_purchases')
      .insert({
        shop_id: profileData.shop_id,
        package_id: packageId,
        sms_count: packageData.sms_count,
        price_paid_cents: packageData.price_cents,
        stripe_payment_intent_id: session.id,
        status: 'pending'
      });

    if (purchaseError) {
      logStep("Error recording purchase", { error: purchaseError });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in purchase-sms-package", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});