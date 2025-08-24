import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const accountSid = Deno.env.get('ACCOUNT_SID');
const authToken = Deno.env.get('AUTH_TOKEN');
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

interface SMSRequest {
  shopId: string;
  toNumber: string;
  message: string;
  type: 'sav_notification' | 'quote_notification' | 'manual' | 'status_change';
  recordId?: string;
}

function formatPhoneNumber(phoneNumber: string): string {
  // Nettoie le numéro (supprime espaces, tirets, etc.)
  let cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
  
  // Si le numéro commence par 0 et fait 10 chiffres (format français)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Convertit au format international français
    return '+33' + cleaned.substring(1);
  }
  
  // Si le numéro commence déjà par +33
  if (cleaned.startsWith('+33')) {
    return cleaned;
  }
  
  // Si le numéro commence par 33 sans le +
  if (cleaned.startsWith('33') && cleaned.length === 11) {
    return '+' + cleaned;
  }
  
  // Pour les autres formats, on assume que c'est déjà correct
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}

async function sendTwilioSMS(to: string, body: string): Promise<any> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', twilioPhoneNumber!);
  params.append('Body', body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function checkSMSCredits(shopId: string): Promise<boolean> {
  // Vérifier les crédits SMS de la boutique avec plan + packages SMS
  const { data: shop, error } = await supabase
    .from('shops')
    .select('sms_credits_used, sms_credits_allocated, subscription_forced, subscription_tier')
    .eq('id', shopId)
    .single();

  if (error) {
    console.error('Erreur lors de la vérification des crédits:', error);
    return false;
  }

  // Si l'abonnement est forcé, autoriser l'envoi
  if (shop.subscription_forced) {
    return true;
  }

  // Calculer le total des SMS achetés via packages
  const { data: packages, error: packagesError } = await supabase
    .from('sms_package_purchases')
    .select('sms_count')
    .eq('shop_id', shopId)
    .eq('status', 'completed');

  if (packagesError) {
    console.error('Erreur lors de la récupération des packages SMS:', packagesError);
  }

  const packagedSMS = packages?.reduce((total, pkg) => total + pkg.sms_count, 0) || 0;
  
  // Total disponible = limite du plan + SMS achetés via packages
  const totalSMSAvailable = shop.sms_credits_allocated + packagedSMS;
  
  console.log(`Vérification SMS: ${shop.sms_credits_used}/${totalSMSAvailable} (plan: ${shop.sms_credits_allocated}, packages: ${packagedSMS})`);
  
  return shop.sms_credits_used < totalSMSAvailable;
}

async function updateSMSCredits(shopId: string): Promise<void> {
  // Récupérer les crédits actuels
  const { data: shop } = await supabase
    .from('shops')
    .select('sms_credits_used')
    .eq('id', shopId)
    .single();

  if (shop) {
    // Incrémenter les crédits utilisés
    await supabase
      .from('shops')
      .update({ 
        sms_credits_used: shop.sms_credits_used + 1
      })
      .eq('id', shopId);
  }
}

async function logSMSHistory(request: SMSRequest, status: string): Promise<void> {
  await supabase
    .from('sms_history')
    .insert({
      shop_id: request.shopId,
      to_number: request.toNumber,
      message: request.message,
      type: request.type,
      record_id: request.recordId,
      status: status
    });
}

async function addSMSToSAVChat(request: SMSRequest, messageSid: string): Promise<void> {
  // Ajouter l'envoi SMS dans le chat du SAV si c'est lié à un dossier SAV
  if (request.recordId && (request.type === 'sav_notification' || request.type === 'manual' || request.type === 'status_change')) {
    try {
      // Vérifier si c'est un dossier SAV
      const { data: savCase } = await supabase
        .from('sav_cases')
        .select('id, case_number')
        .eq('id', request.recordId)
        .single();

      if (savCase) {
        // Formater le message pour le chat avec style SMS
        const chatMessage = `📱 SMS envoyé au ${formatPhoneNumberForDisplay(request.toNumber)}\n\n"${request.message}"\n\n✅ Message ID: ${messageSid}`;
        
        // Obtenir le nom de la boutique pour le sender
        const { data: shop } = await supabase
          .from('shops')
          .select('name')
          .eq('id', request.shopId)
          .single();

        const shopName = shop?.name || 'Boutique';
        
        // Ajouter le message dans le chat SAV
        await supabase
          .from('sav_messages')
          .insert({
            sav_case_id: request.recordId,
            shop_id: request.shopId,
            sender_type: 'shop',
            sender_name: `📱 SMS - ${shopName}`,
            message: chatMessage,
            read_by_shop: true,
            read_by_client: false
          });

        console.log(`Message SMS ajouté au chat du dossier SAV ${savCase.case_number}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du SMS au chat SAV:', error);
      // Ne pas faire échouer l'envoi SMS pour une erreur de chat
    }
  }
}

function formatPhoneNumberForDisplay(phoneNumber: string): string {
  // Masquer partiellement le numéro pour la sécurité
  if (phoneNumber.length > 6) {
    return phoneNumber.substring(0, 3) + '***' + phoneNumber.substring(phoneNumber.length - 2);
  }
  return phoneNumber;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      throw new Error('Configuration Twilio manquante');
    }

    const smsRequest: SMSRequest = await req.json();
    
    console.log('Demande d\'envoi SMS:', smsRequest);

    // Vérifier les crédits SMS
    const hasCredits = await checkSMSCredits(smsRequest.shopId);
    if (!hasCredits) {
      await logSMSHistory(smsRequest, 'failed_no_credits');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Crédits SMS insuffisants' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Formatter le numéro au format international
    const formattedNumber = formatPhoneNumber(smsRequest.toNumber);
    console.log(`Numéro formaté: ${smsRequest.toNumber} -> ${formattedNumber}`);

    // Envoyer le SMS via Twilio
    const twilioResponse = await sendTwilioSMS(formattedNumber, smsRequest.message);
    console.log('Réponse Twilio:', twilioResponse);

    if (twilioResponse.sid) {
      // SMS envoyé avec succès
      await updateSMSCredits(smsRequest.shopId);
      await logSMSHistory(smsRequest, 'sent');

      // Ajouter un message dans le chat SAV pour tracer l'envoi SMS
      await addSMSToSAVChat(smsRequest, twilioResponse.sid);

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageSid: twilioResponse.sid,
          message: 'SMS envoyé avec succès'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Erreur lors de l'envoi
      await logSMSHistory(smsRequest, 'failed');
      throw new Error('Erreur lors de l\'envoi du SMS');
    }

  } catch (error: any) {
    console.error('Erreur dans send-sms function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});