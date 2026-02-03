import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateShortTrackingUrl } from '@/utils/trackingUtils';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SendSMSRequest {
  toNumber: string;
  message: string;
  type: 'sav_notification' | 'quote_notification' | 'manual' | 'review_request' | 'appointment_proposal';
  recordId?: string;
}

export function useSMS() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();
  const { checkLimits } = useSubscription();

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
        throw new Error(`Erreur technique: ${error.message}`);
      }

      if (!data?.success) {
        // Gérer les erreurs avec popup pour achat de SMS
        if (data?.action === 'buy_sms_package') {
          window.location.href = '/subscription';
          toast({
            title: "Crédits SMS épuisés",
            description: "Vos crédits du plan sont épuisés. Achetez un pack SMS pour continuer.",
            variant: "destructive",
          });
          return false;
        }
        
        throw new Error(data?.error || 'Erreur lors de l\'envoi du SMS');
      }

      toast({
        title: "SMS envoyé",
        description: "Le SMS a été envoyé avec succès",
      });

      // Trigger a page reload to refresh all SMS counters
      window.location.reload();

      return true;
    } catch (error: any) {
      // Gérer les erreurs liées aux crédits
      if (error.message.includes('Crédits SMS insuffisants') || error.message.includes('épuisés')) {
        window.location.href = '/subscription';
        toast({
          title: "Crédits SMS épuisés",
          description: "Achetez des crédits supplémentaires pour continuer à envoyer des SMS.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message || 'Erreur lors de l\'envoi du SMS',
          variant: "destructive",
        });
      }

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
    const { data: savCase } = await supabase
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
      case 'ready_for_pickup':
        message = `Bonjour ${customerName}, votre appareil (dossier ${caseNumber}) est prêt ! Vous pouvez venir le récupérer.${smsWarning}`;
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

  const sendReviewRequestSMS = async (
    customerPhone: string,
    customerName: string,
    caseNumber: string,
    reviewLink: string,
    customMessage?: string,
    savCaseId?: string
  ): Promise<boolean> => {
    // Utiliser le message personnalisé ou le message par défaut
    const message = customMessage || 
      `Bonjour ${customerName}, votre réparation ${caseNumber} est terminée ! 🎉\n\nSi vous êtes satisfait(e), laissez-nous un avis : ${reviewLink}\n\nMerci pour votre confiance ! ⭐`;

    return await sendSMS({
      toNumber: customerPhone,
      message,
      type: 'review_request',
      recordId: savCaseId,
    });
  };

  const sendAppointmentSMS = async (
    customerPhone: string,
    customerName: string,
    appointmentDateTime: Date,
    appointmentType: string,
    durationMinutes: number,
    confirmUrl: string,
    savCaseId?: string
  ): Promise<boolean> => {
    const formattedDate = format(appointmentDateTime, "EEEE d MMMM", { locale: fr });
    const formattedTime = format(appointmentDateTime, "HH'h'mm", { locale: fr });
    
    const message = `Bonjour ${customerName},

Nous vous proposons un RDV le ${formattedDate} à ${formattedTime} pour votre ${appointmentType.toLowerCase()} (durée: ${durationMinutes}min).

Confirmez ici : ${confirmUrl}

⚠️ Ne répondez pas à ce SMS.`;

    return await sendSMS({
      toNumber: customerPhone,
      message,
      type: 'appointment_proposal',
      recordId: savCaseId,
    });
  };

  return {
    sendSMS,
    sendSAVNotification,
    sendQuoteNotification,
    sendReviewRequestSMS,
    sendAppointmentSMS,
    loading,
  };
}