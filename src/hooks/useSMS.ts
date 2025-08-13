import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateShortTrackingUrl } from '@/utils/trackingUtils';
import { useProfile } from '@/hooks/useProfile';

interface SendSMSRequest {
  toNumber: string;
  message: string;
  type: 'sav_notification' | 'quote_notification' | 'manual';
  recordId?: string;
}

export function useSMS() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();

  const sendSMS = async (request: SendSMSRequest): Promise<boolean> => {
    if (!profile?.shop_id) {
      toast({
        title: "Erreur",
        description: "Boutique non trouvée",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          shopId: profile.shop_id,
          toNumber: request.toNumber,
          message: request.message,
          type: request.type,
          recordId: request.recordId,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erreur lors de l\'envoi du SMS');
      }

      // Si c'est un SMS lié à un SAV, l'archiver dans les messages
      if (request.recordId && (request.type === 'sav_notification' || request.type === 'manual')) {
        console.log('🔍 Tentative d\'archivage SMS pour recordId:', request.recordId, 'type:', request.type);
        try {
          // Vérifier que c'est bien un SAV
          const { data: savCase, error: savError } = await supabase
            .from('sav_cases')
            .select('id, case_number')
            .eq('id', request.recordId)
            .single();

          console.log('📋 SAV Case trouvé:', savCase, 'erreur:', savError);

          if (savCase) {
            // Créer un message dans le fil de discussion
            const { data: messageData, error: messageError } = await supabase
              .from('sav_messages')
              .insert({
                sav_case_id: request.recordId,
                shop_id: profile.shop_id,
                sender_type: 'sms',
                sender_name: 'SMS envoyé',
                message: `📱 SMS envoyé au ${request.toNumber}: ${request.message}`,
                read_by_shop: true,
                read_by_client: true
              })
              .select();

            console.log('💬 Message SMS archivé:', messageData, 'erreur:', messageError);
          } else {
            console.warn('⚠️ SAV case non trouvé pour l\'ID:', request.recordId);
          }
        } catch (archiveError) {
          console.error('❌ Erreur lors de l\'archivage du SMS:', archiveError);
          // Ne pas faire échouer l'envoi du SMS si l'archivage échoue
        }
      } else {
        console.log('🔍 Pas d\'archivage SMS car recordId:', request.recordId, 'type:', request.type);
      }

      toast({
        title: "SMS envoyé",
        description: "Le SMS a été envoyé avec succès",
      });

      return true;
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du SMS:', error);
      
      let errorMessage = 'Erreur lors de l\'envoi du SMS';
      if (error.message.includes('Crédits SMS insuffisants')) {
        errorMessage = 'Crédits SMS insuffisants. Contactez votre administrateur.';
      } else if (error.message.includes('Configuration Twilio manquante')) {
        errorMessage = 'Configuration SMS non disponible. Contactez le support.';
      }

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });

      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendSAVNotification = async (
    customerPhone: string,
    customerName: string,
    caseNumber: string,
    status: string,
    savCaseId: string
  ): Promise<boolean> => {
    // Récupérer le tracking_slug du SAV pour générer l'URL courte
    const { data: savCase, error } = await supabase
      .from('sav_cases')
      .select('tracking_slug')
      .eq('id', savCaseId)
      .single();

    const shortTrackingUrl = savCase?.tracking_slug ? generateShortTrackingUrl(savCase.tracking_slug) : '';
    let message = '';
    
    switch (status) {
      case 'in_progress':
        message = `Bonjour ${customerName}, votre dossier SAV ${caseNumber} est maintenant en cours de réparation. Suivi : ${shortTrackingUrl}`;
        break;
      case 'waiting_parts':
        message = `Bonjour ${customerName}, votre dossier SAV ${caseNumber} est en attente de pièces. Suivi : ${shortTrackingUrl}`;
        break;
      case 'ready_for_pickup':
        message = `Bonjour ${customerName}, votre appareil (dossier ${caseNumber}) est prêt ! Vous pouvez venir le récupérer. Suivi : ${shortTrackingUrl}`;
        break;
      case 'delivered':
        message = `Bonjour ${customerName}, merci d'avoir fait confiance à nos services pour votre dossier SAV ${caseNumber}. Suivi : ${shortTrackingUrl}`;
        break;
      default:
        message = `Bonjour ${customerName}, le statut de votre dossier SAV ${caseNumber} a été mis à jour. Suivi : ${shortTrackingUrl}`;
    }

    return await sendSMS({
      toNumber: customerPhone,
      message,
      type: 'sav_notification',
      recordId: savCaseId,
    });
  };

  const sendQuoteNotification = async (
    customerPhone: string,
    customerName: string,
    quoteNumber: string,
    quoteId: string
  ): Promise<boolean> => {
    const message = `Bonjour ${customerName}, votre devis ${quoteNumber} est prêt ! Consultez-le en ligne ou contactez-nous pour plus d'informations.`;

    return await sendSMS({
      toNumber: customerPhone,
      message,
      type: 'quote_notification',
      recordId: quoteId,
    });
  };

  return {
    sendSMS,
    sendSAVNotification,
    sendQuoteNotification,
    loading,
  };
}