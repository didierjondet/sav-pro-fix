const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Montant invalide');
    }

    // Récupérer les clés Twilio depuis les secrets
    const accountSid = Deno.env.get('ACCOUNT_SID');
    const authToken = Deno.env.get('AUTH_TOKEN');

    if (!accountSid || !authToken) {
      throw new Error('Configuration Twilio manquante');
    }

    console.log(`[TWILIO-PURCHASE] Tentative d'achat de ${amount} USD de crédits`);

    // Note: Twilio ne permet pas l'achat direct de crédits via API
    // Cette fonction simule l'achat en ajoutant le montant au solde global
    // Dans un vrai environnement, vous devriez utiliser l'API de facturation Twilio
    // ou rediriger vers leur interface de paiement

    // Pour l'instant, nous allons simuler l'ajout en créant une entrée dans notre table
    // et en informant l'utilisateur qu'il doit effectuer l'achat manuellement

    const purchaseData = {
      amount: amount,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      status: 'manual_required',
      message: 'Veuillez ajouter des crédits manuellement sur le tableau de bord Twilio',
      twilio_dashboard_url: 'https://console.twilio.com/billing/balance'
    };

    // En attendant une vraie intégration, nous retournons les informations
    // pour que l'utilisateur puisse procéder manuellement
    
    console.log('[TWILIO-PURCHASE] Simulation d\'achat créée:', purchaseData);

    return new Response(
      JSON.stringify(purchaseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[TWILIO-PURCHASE] Erreur:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Impossible d\'acheter les crédits'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})