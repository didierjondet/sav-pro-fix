import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import { useSMS } from '@/hooks/useSMS';
import { supabase } from '@/integrations/supabase/client';

interface SatisfactionRequestButtonProps {
  savCaseId: string;
  shopId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  caseNumber: string;
}

export function SatisfactionRequestButton({
  savCaseId,
  shopId,
  customerId,
  customerName,
  customerPhone,
  caseNumber
}: SatisfactionRequestButtonProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const { shop } = useShop();
  const { sendSMS } = useSMS();

  const sendSatisfactionRequest = async () => {
    if (!customerPhone) {
      toast({
        title: "Impossible d'envoyer",
        description: "Le client n'a pas de numéro de téléphone renseigné.",
        variant: "destructive"
      });
      return;
    }

    setSending(true);

    try {
      // 1. Générer un token unique
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_satisfaction_token');

      if (tokenError) throw tokenError;

      const accessToken = tokenData as string;

      // 2. Créer l'enquête de satisfaction
      const { error: insertError } = await supabase
        .from('satisfaction_surveys')
        .insert({
          shop_id: shopId,
          sav_case_id: savCaseId,
          customer_id: customerId || null,
          access_token: accessToken,
          sent_via: 'sms'
        });

      if (insertError) throw insertError;

      // 3. Envoyer le SMS avec le lien
      const satisfactionUrl = `fixway.fr/satisfaction/${accessToken}`;
      const shopName = shop?.name || 'Notre magasin';
      const message = `Bonjour ${customerName}, votre réparation ${caseNumber} est terminée ! Donnez-nous votre avis en 30 secondes : ${satisfactionUrl} - ${shopName}`;

      const smsSent = await sendSMS({
        toNumber: customerPhone,
        message,
        type: 'manual',
        recordId: savCaseId
      });

      if (smsSent) {
        setSent(true);
        toast({
          title: "Questionnaire envoyé",
          description: `Le questionnaire de satisfaction a été envoyé à ${customerName}.`
        });
      }
    } catch (error: any) {
      console.error('Error sending satisfaction request:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le questionnaire.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Button variant="outline" size="sm" disabled className="bg-green-50 text-green-700 border-green-200">
        <Check className="h-4 w-4 mr-2" />
        Questionnaire envoyé
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={sendSatisfactionRequest}
      disabled={sending || !customerPhone}
      className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
    >
      {sending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Envoi...
        </>
      ) : (
        <>
          <Star className="h-4 w-4 mr-2" />
          Questionnaire satisfaction
        </>
      )}
    </Button>
  );
}
