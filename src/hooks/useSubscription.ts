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
  forced?: boolean;
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
      // Récupérer le shop courant
      const profileRes = await (supabase as any)
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();
      const profileData: any = profileRes.data;

      if (profileData?.shop_id) {
        // Charger les infos du shop
        const shopRes = await (supabase as any)
          .from('shops')
          .select('subscription_tier, sms_credits_allocated, sms_credits_used, active_sav_count, subscription_plan_id, subscription_forced')
          .eq('id', profileData.shop_id)
          .single();
        const shopData: any = shopRes.data;

        // Charger le plan si disponible
        let plan: any = null;
        if (shopData?.subscription_plan_id) {
          const planRes = await (supabase as any)
            .from('subscription_plans')
            .select('name, sms_limit, sms_cost, sav_limit, monthly_price')
            .eq('id', shopData.subscription_plan_id)
            .single();
          plan = planRes.data;
        }

        const resolveSubscriptionFromLocal = (fallbackSubscribed = true) => {
          const tier = (plan?.name?.toLowerCase?.() || shopData?.subscription_tier || 'free') as 'free' | 'premium' | 'enterprise';
          setSubscription({
            subscribed: fallbackSubscribed,
            subscription_tier: tier,
            subscription_end: null,
            sms_credits_allocated: plan?.sms_limit ?? shopData?.sms_credits_allocated ?? 15,
            sms_credits_used: shopData?.sms_credits_used ?? 0,
            active_sav_count: shopData?.active_sav_count ?? 0,
            forced: !!shopData?.subscription_forced,
          });
        };

        // Si abonnement forcé, ne pas appeler Stripe et utiliser les données locales
        if (shopData?.subscription_forced) {
          resolveSubscriptionFromLocal(true);
          return;
        }

        // Sinon, tenter de vérifier via Stripe, mais ne pas afficher d'erreur bloquante
        try {
          const { data, error } = await supabase.functions.invoke('check-subscription');
          if (error) {
            console.warn('Stripe verification failed, using local subscription data');
            resolveSubscriptionFromLocal(true);
            return;
          }
          const tier = (plan?.name?.toLowerCase?.() || shopData?.subscription_tier || 'free') as 'free' | 'premium' | 'enterprise';
          setSubscription({
            subscribed: data?.subscribed ?? false,
            subscription_tier: tier,
            subscription_end: data?.subscription_end ?? null,
            sms_credits_allocated: plan?.sms_limit ?? shopData?.sms_credits_allocated ?? 15,
            sms_credits_used: shopData?.sms_credits_used ?? 0,
            active_sav_count: shopData?.active_sav_count ?? 0,
            forced: false,
          });
        } catch (stripeError) {
          console.warn('Stripe API unavailable, using local subscription data');
          resolveSubscriptionFromLocal(true);
        }
      }
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      // Ne pas afficher de toast d'erreur pour éviter de spammer l'utilisateur
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

  const checkLimits = (action?: 'sav' | 'sms') => {
    if (!subscription) {
      return { allowed: false, reason: "Données d'abonnement non disponibles", action: null };
    }

    // Si abonnement forcé, ne pas bloquer
    if (subscription.forced) {
      return { allowed: true, reason: 'Abonnement forcé - vérifications désactivées', action: null };
    }

    const { subscription_tier, sms_credits_used, sms_credits_allocated, active_sav_count } = subscription;

    // Vérification des limites SAV basées sur le plan
    if (action === 'sav' || !action) {
      if (subscription_tier === 'free' && active_sav_count >= 15) {
        return { 
          allowed: false, 
          reason: `Plan Gratuit limité à 15 SAV actifs (${active_sav_count}/15). Passez au plan Premium.`,
          action: 'upgrade_plan'
        };
      }
      if (subscription_tier === 'premium' && active_sav_count >= 100) {
        return { 
          allowed: false, 
          reason: `Plan Premium limité à 100 SAV simultanés (${active_sav_count}/100). Passez au plan Enterprise.`,
          action: 'upgrade_plan'
        };
      }
      // Enterprise = illimité
    }

    // Vérification des limites SMS basées sur le plan
    if (action === 'sms' || !action) {
      const smsUsed = sms_credits_used || 0;
      const smsAllocated = sms_credits_allocated || 0;
      
      if (smsUsed >= smsAllocated) {
        return { 
          allowed: false, 
          reason: `Vous avez utilisé tous vos crédits SMS du mois (${smsUsed}/${smsAllocated})`,
          action: 'buy_sms_package'
        };
      }
    }

    return { allowed: true, reason: 'Dans les limites autorisées', action: null };
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