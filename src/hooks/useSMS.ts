import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateShortTrackingUrl } from '@/utils/trackingUtils';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface SendSMSRequest {
  toNumber: string;
  message: string;
  type: 'sav_notification' | 'quote_notification' | 'manual';
  recordId?: string;
}

export function useSMS() {
  const [loading, setLoading] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitDialogData, setLimitDialogData] = useState<{ action: 'upgrade_plan' | 'buy_sms_package'; reason: string } | null>(null);
  const { toast } = useToast();
  const { profile } = useProfile();
  const { checkLimits } = useSubscription();
  const navigate = useNavigate();

  const sendSMS = async (request: SendSMSRequest): Promise<boolean> => {
    if (!profile?.shop_id) {
      toast({
        title: "Erreur",
        description: "Boutique non trouvée",
        variant: "destructive",
      });
      return false;
    }

    // Vérifier les limites avant d'envoyer
    const limitsCheck = checkLimits('sms');
    if (!limitsCheck.allowed) {
      if (limitsCheck.action === 'buy_sms_package' || limitsCheck.action === 'upgrade_plan') {
        setLimitDialogData({
          action: limitsCheck.action,
          reason: limitsCheck.reason
        });
        setLimitDialogOpen(true);
        navigate('/subscription');
      } else {
        toast({
          title: "Limite atteinte",
          description: limitsCheck.reason,
          variant: "destructive",
        });
      }
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
        throw new Error(data?.error || 'Erreur lors de l\'envoi du SMS');
      }

      toast({
        title: "SMS envoyé",
        description: "Le SMS a été envoyé avec succès",
      });

      return true;
    } catch (error: any) {
      // Gérer les erreurs liées aux crédits
      if (error.message.includes('Crédits SMS insuffisants') || error.message.includes('épuisés')) {
        navigate('/subscription');
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

  return {
    sendSMS,
    sendSAVNotification,
    sendQuoteNotification,
    loading,
  };
}