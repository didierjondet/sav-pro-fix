import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  subscription_end?: string;
  sms_credits_allocated: number;
  sms_credits_used: number;
  active_sav_count: number;
}

export function useSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      // Also get current shop data for limits
      const { data: profileData } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      if (profileData?.shop_id) {
        const { data: shopData } = await supabase
          .from('shops')
          .select('subscription_tier, sms_credits_allocated, sms_credits_used, active_sav_count')
          .eq('id', profileData.shop_id)
          .single();

        if (shopData) {
          setSubscription({
            subscribed: data.subscribed || false,
            subscription_tier: (shopData.subscription_tier as 'free' | 'premium' | 'enterprise') || 'free',
            subscription_end: data.subscription_end,
            sms_credits_allocated: shopData.sms_credits_allocated || 15,
            sms_credits_used: shopData.sms_credits_used || 0,
            active_sav_count: shopData.active_sav_count || 0,
          });
        }
      }
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le statut de l'abonnement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (plan: 'premium' | 'enterprise') => {
    if (!user) return { data: null, error: new Error("Utilisateur non connecté") };
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
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
    }
  };

  const openCustomerPortal = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const checkLimits = async () => {
    if (!subscription) return { allowed: false, reason: 'Subscription not loaded' };

    const { subscription_tier, sms_credits_used, sms_credits_allocated, active_sav_count } = subscription;

    // Utiliser les limites basées sur les plans d'abonnement
    const planLimits = {
      free: { sav_limit: 15, sms_limit: 15 },
      premium: { sav_limit: 10, sms_limit: 100 },
      enterprise: { sav_limit: null, sms_limit: 400 }
    };

    const limits = planLimits[subscription_tier];

    if (limits.sav_limit && active_sav_count >= limits.sav_limit) {
      return { allowed: false, reason: `Plan ${subscription_tier} limité à ${limits.sav_limit} SAV ${subscription_tier === 'premium' ? 'simultanés' : 'actifs'}` };
    }
    if (limits.sms_limit && sms_credits_used >= limits.sms_limit) {
      return { allowed: false, reason: `Plan ${subscription_tier} limité à ${limits.sms_limit} SMS par mois` };
    }

    return { allowed: true, reason: 'Dans les limites' };
  };

  return {
    subscription,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    checkLimits,
    refetch: checkSubscription,
  };
}