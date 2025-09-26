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
    // Récupérer les clés Twilio depuis les secrets
    const accountSid = Deno.env.get('ACCOUNT_SID');
    const authToken = Deno.env.get('AUTH_TOKEN');

    if (!accountSid || !authToken) {
      throw new Error('Configuration Twilio manquante');
    }

    console.log('[TWILIO-BALANCE] Récupération du solde Twilio');

    // Appel à l'API Twilio pour récupérer le solde du compte
    const auth = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TWILIO-BALANCE] Erreur API Twilio:', errorText);
      throw new Error(`Erreur API Twilio: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[TWILIO-BALANCE] Solde récupéré:', data);

    const balanceData = {
      balance: parseFloat(data.balance),
      currency: data.currency,
      lastUpdated: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(balanceData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('[TWILIO-BALANCE] Erreur:', error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Impossible de récupérer le solde Twilio'
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