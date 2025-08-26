import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const url = new URL(req.url);
    const quoteId = url.pathname.split('/').pop();

    if (!quoteId) {
      return new Response(
        JSON.stringify({ error: 'Quote ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Créer un client Supabase avec la clé service (pas anon) pour bypasser RLS
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!supabaseServiceKey || !supabaseUrl) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle POST/PUT requests for status updates
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await req.json();
      const { status } = body;

      if (!status || !['accepted', 'rejected'].includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid status. Must be "accepted" or "rejected"' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Update quote status
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', quoteId)
        .select()
        .single();

      if (updateError || !updatedQuote) {
        console.error('Error updating quote:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update quote status' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, quote: updatedQuote }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle GET requests for quote display
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('Quote not found:', quoteError);
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Récupérer les informations de la boutique
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('name, logo_url, address, phone, email')
      .eq('id', quote.shop_id)
      .single();

    if (shopError) {
      console.error('Shop not found:', shopError);
      return new Response(
        JSON.stringify({ error: 'Shop information not available' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Vérifier si le devis est expiré (plus de 30 jours)
    const now = new Date();
    const createdAt = new Date(quote.created_at);
    const thirtyDaysLater = new Date(createdAt);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const isExpired = now > thirtyDaysLater;

    // Parser les items si c'est une chaîne JSON
    let items = quote.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        items = [];
      }
    }

    // Retourner les données du devis
    const response = {
      quote: {
        ...quote,
        items,
      },
      shop,
      isExpired
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in quote-public function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});