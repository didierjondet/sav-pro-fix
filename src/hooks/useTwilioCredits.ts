import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TwilioBalance {
  balance: number;
  currency: string;
  lastUpdated: string;
}

interface TwilioCreditPurchase {
  amount: number;
  currency: string;
}

export function useTwilioCredits() {
  const [balance, setBalance] = useState<TwilioBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();

  const fetchTwilioBalance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-balance', {
        body: {}
      });

      if (error) throw error;

      setBalance(data);
    } catch (error: any) {
      console.error('Erreur lors de la récupération du solde Twilio:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer le solde Twilio',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const purchaseCredits = async (amount: number) => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-purchase-credits', {
        body: { amount }
      });

      if (error) throw error;

      // Vérifier si c'est un achat manuel requis
      if (data.status === 'manual_required') {
        toast({
          title: 'Action manuelle requise',
          description: `Veuillez ajouter $${amount} de crédits sur votre tableau de bord Twilio, puis synchroniser.`,
          variant: 'default',
        });
        
        // Ouvrir le tableau de bord Twilio dans un nouvel onglet
        window.open(data.twilio_dashboard_url, '_blank');
      } else {
        toast({
          title: 'Succès',
          description: `${amount} USD de crédits SMS achetés avec succès`,
        });
      }

      // Rafraîchir le solde après l'achat
      await fetchTwilioBalance();
      
      return data;
    } catch (error: any) {
      console.error('Erreur lors de l\'achat de crédits:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'acheter les crédits',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setPurchasing(false);
    }
  };

  const syncCreditsWithShops = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-twilio-credits', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Crédits synchronisés avec Twilio',
      });

      return data;
    } catch (error: any) {
      console.error('Erreur lors de la synchronisation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de synchroniser les crédits',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTwilioBalance();
  }, []);

  const testTwilioAuth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-twilio-auth', {
        body: {}
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Test réussi',
          description: `Authentification Twilio OK - Compte: ${data.accountInfo?.friendlyName || 'N/A'}`,
        });
      } else {
        toast({
          title: 'Test échoué',
          description: data.error || 'Erreur inconnue',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erreur test Twilio:', error);
      toast({
        title: 'Erreur test',
        description: error.message || 'Impossible de tester l\'authentification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    balance,
    loading,
    purchasing,
    fetchTwilioBalance,
    purchaseCredits,
    syncCreditsWithShops,
    testTwilioAuth,
  };
}