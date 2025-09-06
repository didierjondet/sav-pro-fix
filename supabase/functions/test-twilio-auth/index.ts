import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get('ACCOUNT_SID');
    const authToken = Deno.env.get('AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    console.log('🔍 Test des secrets Twilio:');
    console.log('- ACCOUNT_SID présent:', !!accountSid, accountSid ? `${accountSid.substring(0, 10)}...` : 'MANQUANT');
    console.log('- AUTH_TOKEN présent:', !!authToken, authToken ? `${authToken.substring(0, 10)}...` : 'MANQUANT');
    console.log('- TWILIO_PHONE_NUMBER:', twilioPhoneNumber || 'MANQUANT');

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuration Twilio manquante',
          details: {
            accountSid: !!accountSid,
            authToken: !!authToken,
            twilioPhoneNumber: !!twilioPhoneNumber
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Test de l'API Twilio - récupérer les infos du compte
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
    const authHeader = `Basic ${btoa(`${accountSid}:${authToken}`)}`;
    
    console.log('🔐 Test d\'authentification Twilio avec:', {
      url: url,
      authHeader: authHeader.substring(0, 30) + '...'
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    console.log('📡 Réponse Twilio - Status:', response.status, 'OK:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur Twilio:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Échec de l\'authentification Twilio',
          status: response.status,
          details: errorText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const accountInfo = await response.json();
    console.log('✅ Authentification Twilio réussie:', {
      accountSid: accountInfo.sid,
      friendlyName: accountInfo.friendly_name,
      status: accountInfo.status
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Authentification Twilio réussie',
        accountInfo: {
          sid: accountInfo.sid,
          friendlyName: accountInfo.friendly_name,
          status: accountInfo.status
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('💥 ERREUR dans test-twilio-auth:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur inconnue'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});