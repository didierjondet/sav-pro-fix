import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';

interface ReviewRequestButtonProps {
  savCaseId: string;
  shopId: string;
  customerName?: string;
  caseNumber?: string;
}

export function ReviewRequestButton({ savCaseId, shopId, customerName, caseNumber }: ReviewRequestButtonProps) {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { shop } = useShop();

  const sendReviewRequest = async () => {
    const shopWithReview = shop as any;
    
    if (!shopWithReview?.review_link) {
      toast({
        title: "Configuration manquante",
        description: "Aucun lien d'avis Google n'est configuré dans les paramètres.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    
    try {
      // Message d'accompagnement pour demander un avis
      const reviewMessage = `Bonjour ${customerName || ''} ! 👋

Votre réparation est maintenant terminée ! Si vous avez été satisfait(e) de notre service, nous vous serions reconnaissants de prendre un moment pour nous laisser un avis.

⭐ Laisser un avis : ${shopWithReview.review_link}

Votre retour nous aide à continuer d'améliorer nos services.

Merci pour votre confiance ! 😊

L'équipe ${shop?.name || 'de réparation'}`;

      // Envoyer le message dans le chat SAV
      const { error } = await supabase
        .from('sav_messages')
        .insert([{
          sav_case_id: savCaseId,
          shop_id: shopId,
          sender_type: 'shop',
          sender_name: shop?.name || 'Équipe SAV',
          message: reviewMessage,
          read_by_shop: true,
          read_by_client: false
        }]);

      if (error) throw error;

      toast({
        title: "Message envoyé",
        description: "La demande d'avis a été envoyée au client dans le chat.",
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // Ne pas afficher le bouton si aucun lien d'avis n'est configuré
  const shopWithReview = shop as any;
  if (!shopWithReview?.review_link) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={sendReviewRequest}
      disabled={sending}
      className="flex items-center gap-2"
    >
      {sending ? (
        <Send className="h-4 w-4 animate-pulse" />
      ) : (
        <Star className="h-4 w-4" />
      )}
      {sending ? 'Envoi...' : 'Demander un avis'}
    </Button>
  );
}