const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Montant invalide');
    }

    console.log(`[TWILIO-PURCHASE] Demande d'achat de ${amount} USD de crédits`);

    // Twilio ne permet pas l'achat direct de crédits via API
    // Rediriger vers l'interface Twilio
    const purchaseData = {
      amount: amount,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      status: 'manual_required',
      message: 'Veuillez ajouter des crédits manuellement sur le tableau de bord Twilio',
      twilio_dashboard_url: 'https://console.twilio.com/us1/billing/manage-billing/add-funds'
    };

    console.log('[TWILIO-PURCHASE] Redirection vers Twilio dashboard');

    return new Response(
      JSON.stringify(purchaseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
