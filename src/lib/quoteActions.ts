import { useCallback } from 'react';
import { Quote, useQuotes } from '@/hooks/useQuotes';
import { useShop } from '@/hooks/useShop';
import { useSMS } from '@/hooks/useSMS';
import { useToast } from '@/hooks/use-toast';
import { generateQuotePDF } from '@/utils/pdfGenerator';

export interface PaymentInfo {
  total: number;
  deposit: number;
  remaining: number;
  state: 'unpaid' | 'partial' | 'paid';
  label: string;
}

/**
 * Calcul centralisé du règlement (devis et SAV) :
 * total, acompte versé, reste à payer.
 */
export function getPaymentInfo(totalAmount?: number | null, depositAmount?: number | null): PaymentInfo {
  const total = Number(totalAmount || 0);
  const deposit = Math.max(0, Number(depositAmount || 0));
  const remaining = Math.max(0, total - deposit);
  let state: PaymentInfo['state'] = 'unpaid';
  if (total > 0 && deposit >= total) state = 'paid';
  else if (deposit > 0) state = 'partial';
  return {
    total,
    deposit,
    remaining,
    state,
    label: state === 'paid' ? 'Payé' : state === 'partial' ? 'Acompte' : 'À régler',
  };
}

export function getQuotePaymentInfo(quote: Pick<Quote, 'total_amount' | 'deposit_amount'>): PaymentInfo {
  return getPaymentInfo(quote.total_amount, quote.deposit_amount);
}

/**
 * Actions partagées entre la page Devis et l'onglet Devis d'un SAV.
 */
export function useQuoteActions() {
  const { shop } = useShop();
  const { toast } = useToast();
  const { sendQuoteNotification } = useSMS();
  const { updateQuote } = useQuotes();

  const printQuote = useCallback((quote: Quote) => {
    try {
      generateQuotePDF(quote, shop);
      toast({ title: 'PDF généré', description: 'Le PDF du devis a été généré avec succès' });
    } catch (error) {
      toast({ title: 'Erreur', description: "Impossible de générer le PDF", variant: 'destructive' });
    }
  }, [shop, toast]);

  const sendQuoteSMS = useCallback(async (quote: Quote) => {
    if (!quote.customer_phone) {
      toast({
        title: 'Erreur',
        description: 'Aucun numéro de téléphone renseigné pour ce client',
        variant: 'destructive',
      });
      return false;
    }
    try {
      const result = await sendQuoteNotification(
        quote.customer_phone,
        quote.customer_name,
        quote.quote_number,
        quote.id
      );
      if (!result) throw new Error("Erreur lors de l'envoi du SMS");

      await updateQuote(quote.id, {
        status: 'sent',
        sms_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast({ title: 'SMS envoyé', description: `Le devis a été envoyé par SMS à ${quote.customer_phone}` });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'envoyer le SMS",
        variant: 'destructive',
      });
      return false;
    }
  }, [sendQuoteNotification, toast, updateQuote]);

  const setQuoteDeposit = useCallback(async (quote: Quote, depositAmount: number) => {
    const value = Math.max(0, Number(depositAmount) || 0);
    const { error } = await updateQuote(quote.id, {
      deposit_amount: value,
      updated_at: new Date().toISOString(),
    });
    if (!error) {
      const info = getPaymentInfo(quote.total_amount, value);
      toast({
        title: 'Règlement mis à jour',
        description: info.remaining === 0
          ? `Devis ${quote.quote_number} : réglé en totalité`
          : `Devis ${quote.quote_number} : reste à payer ${info.remaining.toFixed(2)}€`,
      });
    }
    return { error };
  }, [toast, updateQuote]);

  return { printQuote, sendQuoteSMS, setQuoteDeposit };
}
