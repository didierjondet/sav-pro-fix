import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TwilioBalance {
  balance: number;
  currency: string;
  lastUpdated: string;
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

      if (error) {
        let realError = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx) {
            const body = await ctx.json?.() || ctx;
            realError = body?.error || realError;
          }
        } catch { /* ignore */ }
        console.error('Erreur solde Twilio:', realError);
        return;
      }
      setBalance(data);
    } catch (error: any) {
      console.error('Erreur solde Twilio:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncCreditsWithShops = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-twilio-credits', {
        body: {}
      });

      if (error) {
        let realError = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx) {
            const body = await ctx.json?.() || ctx;
            realError = body?.error || realError;
          }
        } catch { /* ignore */ }

        throw new Error(realError);
      }
      return data;
    } catch (error: any) {
      console.error('Erreur synchronisation:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de synchroniser les crédits',
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

  return {
    balance,
    loading,
    purchasing,
    fetchTwilioBalance,
    syncCreditsWithShops,
  };
}
