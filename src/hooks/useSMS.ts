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

      // L'archivage SMS est géré directement par l'edge function send-sms
      // pour éviter les doublons dans la discussion

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
    
    const smsWarning = `\n\n⚠️ Ne répondez pas à ce SMS. Pour échanger avec nous, consultez votre SAV : ${shortTrackingUrl}`;
    
    switch (status) {
      case 'in_progress':
        message = `Bonjour ${customerName}, votre dossier SAV ${caseNumber} est maintenant en cours de réparation.${smsWarning}`;
        break;
      case 'waiting_parts':
        message = `Bonjour ${customerName}, votre dossier SAV ${caseNumber} est en attente de pièces.${smsWarning}`;
        break;
      case 'ready_for_pickup':
        message = `Bonjour ${customerName}, votre appareil (dossier ${caseNumber}) est prêt ! Vous pouvez venir le récupérer.${smsWarning}`;
        break;
      case 'delivered':
        message = `Bonjour ${customerName}, merci d'avoir fait confiance à nos services pour votre dossier SAV ${caseNumber}.${smsWarning}`;
        break;
      default:
        message = `Bonjour ${customerName}, le statut de votre dossier SAV ${caseNumber} a été mis à jour.${smsWarning}`;
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
    // Générer l'URL publique du devis
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const quoteUrl = `${baseUrl}/quote/${quoteId}`;
    
    const smsWarning = "\n\n⚠️ Ne répondez pas à ce SMS. Contactez-nous directement pour toute question.";
    const message = `Bonjour ${customerName}, votre devis ${quoteNumber} est prêt ! Consultez-le ici: ${quoteUrl}${smsWarning}`;

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