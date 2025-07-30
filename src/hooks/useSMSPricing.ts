import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SMSPricing {
  id: string;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  price_per_sms: number;
  created_at: string;
  updated_at: string;
}

export function useSMSPricing() {
  const [pricing, setPricing] = useState<SMSPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_pricing')
        .select('*')
        .order('subscription_tier');

      if (error) throw error;
      setPricing(data as SMSPricing[] || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les prix SMS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePricing = async (tier: string, pricePerSMS: number) => {
    try {
      const { error } = await supabase
        .from('sms_pricing')
        .update({ 
          price_per_sms: pricePerSMS,
          updated_at: new Date().toISOString()
        })
        .eq('subscription_tier', tier);

      if (error) throw error;

      await fetchPricing();
      toast({
        title: "Succès",
        description: `Prix SMS mis à jour pour le plan ${tier}`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPriceForTier = (tier: string): number => {
    const tierPricing = pricing.find(p => p.subscription_tier === tier);
    return tierPricing?.price_per_sms || 0.10;
  };

  return {
    pricing,
    loading,
    updatePricing,
    getPriceForTier,
    refetch: fetchPricing,
  };
}