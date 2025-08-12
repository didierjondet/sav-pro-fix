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

  const checkLimits = async (action?: 'sav' | 'sms') => {
    if (!subscription) {
      return { allowed: false, reason: "Données d'abonnement non disponibles", action: null };
    }

    // Si abonnement forcé, ne pas bloquer
    if (subscription.forced) {
      return { allowed: true, reason: 'Abonnement forcé - vérifications désactivées', action: null };
    }

    try {
      // Récupérer le shop_id de l'utilisateur
      const profileRes = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user?.id)
        .single();

      if (!profileRes.data?.shop_id) {
        return { allowed: false, reason: "Shop non trouvé", action: null };
      }

      // Utiliser la fonction de base de données qui prend en compte les limites personnalisées
      const { data, error } = await supabase.rpc('check_subscription_limits_v2', {
        p_shop_id: profileRes.data.shop_id,
        p_action: action
      });

      if (error) {
        console.error('Error checking limits:', error);
        return { allowed: false, reason: "Erreur lors de la vérification des limites", action: null };
      }

      const result = data as any;
      return {
        allowed: result?.allowed || false,
        reason: result?.reason || "Erreur inconnue",
        action: result?.action || null
      };
    } catch (error) {
      console.error('Error in checkLimits:', error);
      return { allowed: false, reason: "Erreur lors de la vérification des limites", action: null };
    }
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