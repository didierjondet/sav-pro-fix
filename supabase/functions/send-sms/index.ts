import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-SMS] ${step}${detailsStr}`);
};

// Helper to generate OVH signature
function generateSignature(
  method: string,
  query: string,
  body: string,
  timestamp: number,
  consumerKey: string,
  applicationSecret: string
): string {
  const message = `${applicationSecret}+${consumerKey}+${method}+${query}+${body}+${timestamp}`;
  return crypto.subtle.digest('SHA-1', new TextEncoder().encode(message))
    .then(hash => Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Récupérer les clés OVH
    const applicationKey = Deno.env.get("OVH_APPLICATION_KEY");
    const applicationSecret = Deno.env.get("OVH_APPLICATION_SECRET");
    const consumerKey = Deno.env.get("OVH_CONSUMER_KEY");
    const smsService = Deno.env.get("OVH_SMS_SERVICE");

    if (!applicationKey || !applicationSecret || !consumerKey || !smsService) {
      throw new Error("Missing OVH credentials");
    }

    // Créer le client Supabase avec service role pour bypasser RLS
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
    if (!user) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    // Récupérer les données de la requête
    const { to, message, type, recordId } = await req.json();
    
    if (!to || !message || !type || !recordId) {
      throw new Error("Missing required fields: to, message, type, recordId");
    }

    logStep("Request data", { to, type, recordId });

    // Récupérer le shop_id de l'utilisateur
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (profileError) throw profileError;
    const shopId = profileData.shop_id;
    logStep("Shop ID found", { shopId });

    // Vérifier les crédits SMS disponibles
    const { data: shopData, error: shopError } = await supabaseClient
      .from('shops')
      .select('sms_credits')
      .eq('id', shopId)
      .single();

    if (shopError) throw shopError;
    
    if (!shopData.sms_credits || shopData.sms_credits < 1) {
      throw new Error("Insufficient SMS credits");
    }

    logStep("SMS credits available", { credits: shopData.sms_credits });

    // Préparer l'envoi OVH SMS
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'POST';
    const query = `https://eu.api.ovh.com/1.0/sms/${smsService}/jobs`;
    const body = JSON.stringify({
      message: message,
      receivers: [to],
      sender: "FixWay",
      charset: "UTF-8"
    });

    // Générer la signature OVH
    const signature = await generateSignature(method, query, body, timestamp, consumerKey, applicationSecret);

    // Envoyer le SMS via OVH
    const ovhResponse = await fetch(query, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ovh-Application': applicationKey,
        'X-Ovh-Consumer': consumerKey,
        'X-Ovh-Signature': `$1$${signature}`,
        'X-Ovh-Timestamp': timestamp.toString()
      },
      body: body
    });

    if (!ovhResponse.ok) {
      const errorText = await ovhResponse.text();
      logStep("OVH SMS error", { status: ovhResponse.status, error: errorText });
      throw new Error(`OVH SMS error: ${errorText}`);
    }

    const ovhResult = await ovhResponse.json();
    logStep("SMS sent successfully", ovhResult);

    // Décrémenter les crédits SMS
    const { error: updateError } = await supabaseClient
      .from('shops')
      .update({ sms_credits: shopData.sms_credits - 1 })
      .eq('id', shopId);

    if (updateError) {
      logStep("Warning: Could not update SMS credits", updateError);
    }

    // Enregistrer l'historique SMS (optionnel)
    const { error: historyError } = await supabaseClient
      .from('sms_history')
      .insert({
        shop_id: shopId,
        to_number: to,
        message: message,
        type: type,
        record_id: recordId,
        status: 'sent',
        ovh_job_id: ovhResult.ids?.[0]
      });

    if (historyError) {
      logStep("Warning: Could not save SMS history", historyError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      creditsRemaining: shopData.sms_credits - 1,
      ovhJobId: ovhResult.ids?.[0]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});