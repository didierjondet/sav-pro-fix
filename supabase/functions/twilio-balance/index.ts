const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    if (!TWILIO_API_KEY) throw new Error('TWILIO_API_KEY is not configured');

    console.log('[TWILIO-BALANCE] Récupération du solde via gateway');

    const response = await fetch(`${GATEWAY_URL}/Balance.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TWILIO_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TWILIO-BALANCE] Erreur gateway:', errorText);
      throw new Error(`Erreur Twilio gateway: ${response.status} - ${errorText}`);
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TWILIO-BALANCE] Erreur:', error.message);
    return new Response(
      JSON.stringify({ error: error.message, details: 'Impossible de récupérer le solde Twilio' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
