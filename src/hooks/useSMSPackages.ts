import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';
import { useToast } from './use-toast';

export interface SMSPackage {
  id: string;
  name: string;
  description: string;
  sms_count: number;
  price_cents: number;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  stripe_price_id?: string;
  is_active: boolean;
}

export function useSMSPackages() {
  const [packages, setPackages] = useState<SMSPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const { subscription } = useSubscription();
  const { toast } = useToast();

  const fetchPackages = async () => {
    if (!subscription?.subscription_tier) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sms_packages')
        .select('*')
        .eq('subscription_tier', subscription.subscription_tier)
        .eq('is_active', true)
        .order('price_cents', { ascending: true });

      if (error) throw error;
      setPackages((data || []) as SMSPackage[]);
    } catch (error) {
      console.error('Error fetching SMS packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchasePackage = async (packageId: string) => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-sms-package', {
        body: { packageId }
      });

      if (error) throw error;

      // Ouvrir Stripe checkout dans un nouvel onglet
      if (data.url) {
        window.open(data.url, '_blank');
      }

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    } finally {
      setPurchasing(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [subscription?.subscription_tier]);

  return {
    packages,
    loading,
    purchasing,
    fetchPackages,
    purchasePackage,
  };
}