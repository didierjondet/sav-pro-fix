import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {

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
  console.log('📱 Formatage numéro - Input:', phoneNumber);
  
  // Nettoie le numéro (supprime espaces, tirets, etc.)
  let cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
  console.log('📱 Après nettoyage:', cleaned, 'longueur:', cleaned.length);
  
  // Si le numéro commence par 0 et fait 10 chiffres (format français standard)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    const formatted = '+33' + cleaned.substring(1);
    console.log('📱 Format français standard détecté, résultat:', formatted);
    return formatted;
  }
  
  // Si le numéro commence par 0 et fait 11 chiffres (cas avec chiffre en trop)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Vérifier si c'est un mobile français (06, 07)
    if (cleaned.startsWith('06') || cleaned.startsWith('07')) {
      // Prendre les 10 premiers chiffres et convertir
      const truncated = cleaned.substring(0, 10);
      const formatted = '+33' + truncated.substring(1);
      console.log('📱 Format français 11 chiffres (mobile) détecté, tronqué et converti:', formatted);
      return formatted;
    } else {
      // Pour les autres préfixes (01, 02, 03, 04, 05, 08, 09)
      const formatted = '+33' + cleaned.substring(1, 10);
      console.log('📱 Format français 11 chiffres (fixe) détecté, tronqué et converti:', formatted);
      return formatted;
    }
  }
  
  // Si le numéro commence déjà par +33
  if (cleaned.startsWith('+33')) {
    console.log('📱 Déjà au format +33, résultat:', cleaned);
    return cleaned;
  }
  
  // Si le numéro commence par 33 sans le +
  if (cleaned.startsWith('33') && cleaned.length === 11) {
    const formatted = '+' + cleaned;
    console.log('📱 Format 33 sans +, résultat:', formatted);
    return formatted;
  }
  
  // Pour les autres formats, ajouter + si manquant
  const formatted = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  console.log('📱 Autre format, résultat:', formatted);
  return formatted;
}

async function sendTwilioSMS(to: string, body: string): Promise<any> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  console.log('🔐 Tentative d\'envoi SMS avec:', {
    url: url,
    accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : 'MANQUANT',
    authToken: authToken ? `${authToken.substring(0, 8)}...` : 'MANQUANT',
    from: twilioPhoneNumber,
    to: to
  });
  
  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', twilioPhoneNumber!);
  params.append('Body', body);

  const authHeader = `Basic ${btoa(`${accountSid}:${authToken}`)}`;
  console.log('🔐 En-tête d\'autorisation généré:', authHeader.substring(0, 20) + '...');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  console.log('📡 Réponse Twilio - Status:', response.status, 'OK:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Réponse d\'erreur Twilio complète:', errorText);
    throw new Error(`Twilio API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function checkSMSCredits(shopId: string): Promise<{allowed: boolean, reason?: string, action?: string}> {
  // Vérifier les crédits SMS de la boutique avec plan + packages SMS
  const { data: shop, error } = await supabase
    .from('shops')
    .select('sms_credits_allocated, subscription_forced, monthly_sms_used, custom_sms_limit, purchased_sms_credits, admin_added_sms_credits')
    .eq('id', shopId)
    .single();

  if (error) {
    console.error('Erreur lors de la vérification des crédits:', error);
    return { allowed: false, reason: 'Erreur technique' };
  }

  // Si l'abonnement est forcé, autoriser l'envoi
  if (shop.subscription_forced) {
    console.log('✅ Abonnement forcé - envoi autorisé');
    return { allowed: true };
  }

  // 1. Vérifier d'abord les crédits du plan mensuel
  const monthlyLimit = shop.custom_sms_limit || shop.sms_credits_allocated || 0;
  const monthlyUsed = shop.monthly_sms_used || 0;
  const monthlyAvailable = Math.max(0, monthlyLimit - monthlyUsed);
  
  if (monthlyAvailable > 0) {
    console.log(`✅ Crédits plan disponibles: ${monthlyAvailable} (${monthlyUsed}/${monthlyLimit})`);
    return { allowed: true };
  }
  
  // 2. Si plus de crédits du plan, vérifier les SMS achetés + admin
  const { data: packages, error: packagesError } = await supabase
    .from('sms_package_purchases')
    .select('sms_count')
    .eq('shop_id', shopId)
    .eq('status', 'completed');

  if (packagesError) {
    console.error('Erreur lors de la récupération des packages SMS:', packagesError);
  }

  const totalPackagesSMS = packages?.reduce((total, pkg) => total + pkg.sms_count, 0) || 0;
  const adminAddedSMS = shop.admin_added_sms_credits || 0;
  const totalPurchasedAndAdmin = totalPackagesSMS + adminAddedSMS;
  const usedPurchasedSMS = shop.purchased_sms_credits || 0;
  const availablePurchasedSMS = Math.max(0, totalPurchasedAndAdmin - usedPurchasedSMS);
  
  console.log(`Vérification SMS détaillée:
    - Plan mensuel: ${monthlyUsed}/${monthlyLimit} (disponible: ${monthlyAvailable})
    - Packages achetés: ${totalPackagesSMS}
    - Admin ajoutés: ${adminAddedSMS}  
    - Total acheté+admin: ${totalPurchasedAndAdmin}
    - Utilisés acheté+admin: ${usedPurchasedSMS}
    - Disponible acheté+admin: ${availablePurchasedSMS}`);
  
  if (availablePurchasedSMS > 0) {
    console.log(`✅ Crédits achetés/admin disponibles: ${availablePurchasedSMS}`);
    return { allowed: true };
  }
  
  // Aucun crédit disponible - proposer d'acheter un pack
  return { 
    allowed: false, 
    reason: 'Crédits SMS épuisés', 
    action: 'buy_sms_package' 
  };
}

async function updateSMSCredits(shopId: string): Promise<void> {
  try {
    console.log('💳 DÉBUT DÉCOMPTE SMS pour shop:', shopId);
    
    // Récupérer les données actuelles du shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('monthly_sms_used, sms_credits_allocated, purchased_sms_credits, custom_sms_limit, admin_added_sms_credits')
      .eq('id', shopId)
      .single();

    if (shopError) {
      console.error('❌ Erreur lors de la récupération des données shop:', shopError);
      throw new Error(`Erreur récupération shop: ${shopError.message}`);
    }

    if (!shop) {
      console.error('❌ Shop non trouvé pour ID:', shopId);
      throw new Error('Shop non trouvé');
    }

    console.log('📊 Données shop actuelles:', {
      monthly_sms_used: shop.monthly_sms_used,
      sms_credits_allocated: shop.sms_credits_allocated,
      purchased_sms_credits: shop.purchased_sms_credits,
      custom_sms_limit: shop.custom_sms_limit,
      admin_added_sms_credits: shop.admin_added_sms_credits
    });

    // Limite mensuelle
    const monthlyLimit = shop.custom_sms_limit || shop.sms_credits_allocated || 0;
    const monthlyUsed = shop.monthly_sms_used || 0;

    console.log('💡 Logique de décompte - Plan mensuel:', {
      monthlyUsed,
      monthlyLimit,
      hasMonthlyCredits: monthlyUsed < monthlyLimit
    });

    // PRIORITÉ 1: Utiliser d'abord les SMS mensuels
    if (monthlyUsed < monthlyLimit) {
      console.log('📱 Débit des crédits du plan mensuel');
      const newMonthlyUsed = monthlyUsed + 1;
      
      const { error: updateError } = await supabase
        .from('shops')
        .update({ 
          monthly_sms_used: newMonthlyUsed
        })
        .eq('id', shopId);

      if (updateError) {
        console.error('❌ Erreur mise à jour monthly_sms_used:', updateError);
        throw new Error(`Erreur décompte mensuel: ${updateError.message}`);
      }

      console.log(`✅ Crédits mensuels mis à jour: ${monthlyUsed} -> ${newMonthlyUsed}`);
      return;
    }

    // PRIORITÉ 2: Si plus de crédits du plan, utiliser les SMS achetés/admin
    console.log('📦 Débit des crédits achetés/admin (plan épuisé)');
    const newPurchasedUsed = (shop.purchased_sms_credits || 0) + 1;
    
    const { error: updatePurchasedError } = await supabase
      .from('shops')
      .update({ 
        purchased_sms_credits: newPurchasedUsed
      })
      .eq('id', shopId);

    if (updatePurchasedError) {
      console.error('❌ Erreur mise à jour purchased_sms_credits:', updatePurchasedError);
      throw new Error(`Erreur décompte achetés: ${updatePurchasedError.message}`);
    }

    console.log(`✅ Crédits achetés/admin mis à jour: ${shop.purchased_sms_credits || 0} -> ${newPurchasedUsed}`);
    console.log('💳 DÉCOMPTE SMS TERMINÉ AVEC SUCCÈS');
    
  } catch (error) {
    console.error('💥 ERREUR CRITIQUE DANS updateSMSCredits:', error);
    throw error; // Propager l'erreur pour que l'appelant puisse la gérer
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
  // Ajouter l'envoi SMS dans le chat du SAV si c'est lié à un dossier SAV (pas pour les devis)
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
  console.log('=== DEBUT FONCTION SEND-SMS ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('1. Vérification configuration Twilio...');
    console.log('Variables d\'environnement Twilio:', {
      accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : 'MANQUANT',
      authToken: authToken ? `${authToken.substring(0, 8)}...` : 'MANQUANT',
      twilioPhoneNumber: twilioPhoneNumber || 'MANQUANT'
    });
    
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      console.error('❌ Configuration Twilio manquante:', { 
        accountSid: !!accountSid, 
        authToken: !!authToken, 
        twilioPhoneNumber: !!twilioPhoneNumber 
      });
      throw new Error('Configuration Twilio manquante');
    }
    console.log('✅ Configuration Twilio OK');

    console.log('2. Parsing de la requête...');
    const smsRequest: SMSRequest = await req.json();
    console.log('✅ Requête parsée:', smsRequest);
    
    console.log('3. Vérification des crédits SMS...');
    const creditsCheck = await checkSMSCredits(smsRequest.shopId);
    if (!creditsCheck.allowed) {
      console.error('❌ Crédits SMS insuffisants:', creditsCheck.reason);
      await logSMSHistory(smsRequest, 'failed_no_credits');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: creditsCheck.reason || 'Crédits SMS insuffisants',
          action: creditsCheck.action
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log('✅ Crédits SMS OK');

    console.log('4. Formatage du numéro...');
    const formattedNumber = formatPhoneNumber(smsRequest.toNumber);
    console.log(`✅ Numéro formaté: ${smsRequest.toNumber} -> ${formattedNumber}`);

    console.log('5. Envoi SMS via Twilio...');
    const twilioResponse = await sendTwilioSMS(formattedNumber, smsRequest.message);
    console.log('✅ Réponse Twilio:', twilioResponse);

    if (twilioResponse.sid) {
      console.log('6. Mise à jour des crédits...');
      try {
        await updateSMSCredits(smsRequest.shopId);
        console.log('✅ Crédits mis à jour avec succès');
      } catch (creditsError) {
        console.error('❌ ERREUR lors de la mise à jour des crédits:', creditsError);
        // Log l'erreur mais continuer - le SMS a déjà été envoyé
        await logSMSHistory({ ...smsRequest, type: 'error_credits' }, 'sent_credits_error');
      }
      
      console.log('7. Log de l\'historique...');
      await logSMSHistory(smsRequest, 'sent');
      console.log('✅ Historique loggé');

      console.log('8. Ajout au chat SAV (si applicable)...');
      await addSMSToSAVChat(smsRequest, twilioResponse.sid);
      console.log('✅ Chat SAV traité');

      console.log('=== SMS ENVOYÉ AVEC SUCCÈS ===');
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
      console.error('❌ Pas de SID dans la réponse Twilio');
      await logSMSHistory(smsRequest, 'failed');
      throw new Error('Erreur lors de l\'envoi du SMS');
    }

  } catch (error: any) {
    console.error('💥 ERREUR DANS SEND-SMS:', error);
    console.error('Stack trace:', error.stack);
    
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