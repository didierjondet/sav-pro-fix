import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const TWILIO_GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  interface SMSRequest {
    shopId: string;
    toNumber: string;
    message: string;
    type: 'sav_notification' | 'quote_notification' | 'manual' | 'status_change' | 'review_request' | 'appointment_proposal' | 'satisfaction';
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
    
    // Si le numéro commence par +33 et fait 12 caractères
    if (cleaned.startsWith('+33') && cleaned.length === 12) {
      console.log('📱 Format international français détecté, résultat:', cleaned);
      return cleaned;
    }
    
    // Si le numéro commence par 33 et fait 11 chiffres
    if (cleaned.startsWith('33') && cleaned.length === 11) {
      const formatted = '+' + cleaned;
      console.log('📱 Format international sans + détecté, résultat:', formatted);
      return formatted;
    }
    
    // Sinon, retourner tel quel et laisser Twilio gérer
    console.log('📱 Format non reconnu, retour tel quel:', cleaned);
    return cleaned;
  }

  try {
    console.log('🔥 NOUVELLE REQUÊTE SMS REÇUE');
    
    if (!lovableApiKey) {
      console.error('❌ LOVABLE_API_KEY manquante');
      throw new Error('Configuration passerelle Twilio manquante (LOVABLE_API_KEY)');
    }

    if (!twilioApiKey) {
      console.error('❌ TWILIO_API_KEY manquante');
      throw new Error('Configuration passerelle Twilio manquante (TWILIO_API_KEY)');
    }

    if (!twilioPhoneNumber) {
      console.error('❌ Configuration Twilio manquante');
      throw new Error('Numéro Twilio manquant');
    }

    const requestData: SMSRequest = await req.json();
    console.log('📩 Données reçues:', requestData);

    const { shopId, toNumber, message, type, recordId } = requestData;
    
    if (!shopId || !toNumber || !message) {
      console.error('❌ Paramètres manquants:', { shopId, toNumber, message });
      throw new Error('Paramètres requis manquants');
    }

    // Vérifier les limites du shop
    console.log('🔍 Vérification des limites du shop:', shopId);
    
    let { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
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

    console.log('🏪 Shop trouvé:', {
      name: shop.name,
      subscription_tier: shop.subscription_tier,
      monthly_sms_used: shop.monthly_sms_used,
      sms_credits_allocated: shop.sms_credits_allocated
    });

    // Réinitialiser les compteurs mensuels si nécessaire (début du mois)
    console.log('🔄 Vérification réinitialisation mensuelle...');
    const { error: resetError } = await supabase.rpc('reset_monthly_counters');
    if (resetError) {
      console.error('⚠️ Erreur réinitialisation mensuelle:', resetError);
    } else {
      console.log('✅ Compteurs mensuels vérifiés/réinitialisés');
    }

    // Récupérer à nouveau les données shop après potentielle réinitialisation
    const { data: refreshedShop, error: refreshError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();
    
    if (refreshError || !refreshedShop) {
      console.error('❌ Erreur lors du rafraîchissement des données shop:', refreshError);
    } else {
      shop = refreshedShop;
      console.log('🔄 Données shop rafraîchies:', {
        monthly_sms_used: shop.monthly_sms_used,
        sms_credits_allocated: shop.sms_credits_allocated
      });
    }

    // Formater le numéro de téléphone
    const formattedNumber = formatPhoneNumber(toNumber);
    console.log('📱 Numéro formaté pour Twilio:', formattedNumber);

    // Préparer la requête Twilio
    const body = new URLSearchParams({
      From: twilioPhoneNumber,
      To: formattedNumber,
      Body: message,
    });

    console.log('📤 Envoi vers Twilio...');
    console.log('From:', twilioPhoneNumber);
    console.log('To:', formattedNumber);
    console.log('Body:', message);

    // Envoyer le SMS via la passerelle Twilio Lovable
    const response = await fetch(`${TWILIO_GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': twilioApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    const responseData = await response.json();
    console.log('📡 Réponse Twilio:', responseData);

    if (response.ok) {
      console.log('✅ SMS envoyé avec succès:', responseData.sid);
      
      // Logique de décompte SMS correcte : d'abord les crédits mensuels, puis les achetés
      const currentMonthlyUsed = shop.monthly_sms_used || 0;
      const monthlyLimit = shop.sms_credits_allocated || 0;
      const currentPurchasedUsed = shop.purchased_sms_credits || 0;
      
      let updateData: any = {};
      
      if (currentMonthlyUsed < monthlyLimit) {
        // Utiliser d'abord les crédits mensuels
        updateData.monthly_sms_used = currentMonthlyUsed + 1;
        console.log('💳 Utilisation des crédits mensuels:', currentMonthlyUsed + 1, '/', monthlyLimit);
      } else {
        // Les crédits mensuels sont épuisés, utiliser les crédits achetés/admin
        updateData.purchased_sms_credits = currentPurchasedUsed + 1;
        console.log('💰 Utilisation des crédits achetés/admin:', currentPurchasedUsed + 1);
      }

      const { error: updateError } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', shopId);

      if (updateError) {
        console.error('⚠️ Erreur mise à jour compteur SMS:', updateError);
      } else {
        console.log('📊 Compteur SMS mis à jour');
      }

      // Enregistrer dans l'historique SMS
      const { error: historyError } = await supabase
        .from('sms_history')
        .insert({
          shop_id: shopId,
          type: type,
          message: message,
          to_number: formattedNumber,
          status: 'sent',
          twilio_sid: responseData.sid,
          record_id: recordId || null,
        });

      if (historyError) {
        console.error('⚠️ Erreur enregistrement historique:', historyError);
      } else {
        console.log('📝 SMS enregistré dans l\'historique');
      }

      // Intégrer le SMS dans la discussion du SAV si applicable
      if (recordId && (type === 'sav_notification' || type === 'status_change' || type === 'manual' || type === 'review_request')) {
        console.log('💬 Intégration du SMS dans la discussion du SAV:', recordId);
        
        // Vérifier que le recordId correspond bien à un SAV
        const { data: savCase, error: savError } = await supabase
          .from('sav_cases')
          .select('id')
          .eq('id', recordId)
          .single();
        
        if (savCase && !savError) {
          // Formater le message pour la discussion
          const maskedNumber = formattedNumber.slice(0, 8) + '***' + formattedNumber.slice(-2);
          let discussionPrefix = '📱 SMS envoyé au';
          
          if (type === 'review_request') {
            discussionPrefix = '⭐ Demande d\'avis envoyée au';
          }
          
          const discussionMessage = `${discussionPrefix} ${maskedNumber}\n\n"${message}"\n\n✅ Message ID: ${responseData.sid}`;
          
          // Insérer dans sav_messages
          const { error: messageError } = await supabase
            .from('sav_messages')
            .insert({
              sav_case_id: recordId,
              shop_id: shopId,
              sender_type: 'shop',
              sender_name: type === 'review_request' ? `⭐ Demande d'avis - ${shop.name}` : `📱 SMS - ${shop.name}`,
              message: discussionMessage,
              read_by_shop: true,
              read_by_client: false,
            });
          
          if (messageError) {
            console.error('⚠️ Erreur intégration SMS dans discussion:', messageError);
          } else {
            console.log('✅ SMS intégré dans la discussion');
          }
        } else {
          console.log('ℹ️ RecordId ne correspond pas à un SAV, pas d\'intégration dans la discussion');
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          sid: responseData.sid,
          message: 'SMS envoyé avec succès'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
      
    } else {
      console.error('❌ Erreur Twilio:', responseData);
      
      // Enregistrer l'échec dans l'historique
      await supabase
        .from('sms_history')
        .insert({
          shop_id: shopId,
          type: type,
          message: message,
          to_number: formattedNumber,
          status: 'failed',
          error_message: responseData.message || 'Erreur Twilio inconnue',
          record_id: recordId || null,
        });

      // Déterminer le message d'erreur et le code HTTP approprié
      let errorMessage = responseData.message || 'Erreur Twilio inconnue';
      let httpStatus = response.status;
      
      if (response.status === 401 || responseData.code === 20003) {
        errorMessage = 'Connexion Twilio invalide ou expirée. Veuillez reconnecter le service Twilio dans les paramètres du projet Lovable.';
      } else if (response.status === 429) {
        errorMessage = 'Trop de SMS envoyés. Veuillez réessayer dans quelques instants.';
      } else if (response.status === 503) {
        errorMessage = 'Service Twilio temporairement indisponible. Réessayez dans quelques instants.';
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          twilio_code: responseData.code,
          twilio_status: response.status,
        }),
        {
          status: httpStatus,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
})