import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  subscription_end?: string;
  sms_credits_allocated: number;
  sms_credits_used: number; // Total SMS utilisés (gardé pour compatibilité)
  monthly_sms_used: number; // SMS du plan utilisés ce mois-ci
  purchased_sms_credits?: number; // SMS achetés déjà utilisés
  active_sav_count: number; // Total SAV actifs (gardé pour compatibilité)  
  monthly_sav_count: number; // SAV créés ce mois-ci
  forced?: boolean;
  custom_sav_limit?: number;
  custom_sms_limit?: number;
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
        // Charger les infos du shop avec les nouvelles colonnes mensuelles
        const shopRes = await (supabase as any)
          .from('shops')
          .select('subscription_tier, sms_credits_allocated, sms_credits_used, monthly_sms_used, purchased_sms_credits, active_sav_count, monthly_sav_count, subscription_plan_id, subscription_forced, custom_sav_limit, custom_sms_limit')
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
            sms_credits_allocated: shopData?.custom_sms_limit ?? plan?.sms_limit ?? shopData?.sms_credits_allocated ?? 15,
            sms_credits_used: shopData?.sms_credits_used ?? 0,
            monthly_sms_used: shopData?.monthly_sms_used ?? 0,
            purchased_sms_credits: shopData?.purchased_sms_credits ?? 0,
            active_sav_count: shopData?.active_sav_count ?? 0,
            monthly_sav_count: shopData?.monthly_sav_count ?? 0,
            forced: !!shopData?.subscription_forced,
            custom_sav_limit: shopData?.custom_sav_limit,
            custom_sms_limit: shopData?.custom_sms_limit
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
            sms_credits_allocated: shopData?.custom_sms_limit ?? plan?.sms_limit ?? shopData?.sms_credits_allocated ?? 15,
            sms_credits_used: shopData?.sms_credits_used ?? 0,
            monthly_sms_used: shopData?.monthly_sms_used ?? 0,
            purchased_sms_credits: shopData?.purchased_sms_credits ?? 0,
            active_sav_count: shopData?.active_sav_count ?? 0,
            monthly_sav_count: shopData?.monthly_sav_count ?? 0,
            forced: false,
            custom_sav_limit: shopData?.custom_sav_limit,
            custom_sms_limit: shopData?.custom_sms_limit
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

    const { subscription_tier, monthly_sms_used, sms_credits_allocated, monthly_sav_count, custom_sav_limit, custom_sms_limit, purchased_sms_credits } = subscription;

    // Calculer les SMS achetés disponibles
    const purchasedSmsAvailable = Math.max(0, (purchased_sms_credits || 0));

    // Vérification des limites SAV mensuelles
    if (action === 'sav' || !action) {
      let savLimit = custom_sav_limit;
      
      if (!savLimit) {
        if (subscription_tier === 'free') {
          savLimit = 5;
        } else if (subscription_tier === 'premium') {
          savLimit = 50;
        } else if (subscription_tier === 'enterprise') {
          savLimit = 100;
        } else {
          savLimit = 5;
        }
      }

      if (monthly_sav_count >= savLimit) {
        const message = custom_sav_limit 
          ? `Limite SAV mensuelle personnalisée atteinte (${monthly_sav_count}/${savLimit}). Contactez le support.`
          : `Plan ${subscription_tier} limité à ${savLimit} SAV par mois (${monthly_sav_count}/${savLimit}). Renouvellement le 1er du mois prochain.`;
        
        return { 
          allowed: false, 
          reason: message,
          action: custom_sav_limit ? 'contact_support' : 'upgrade_plan'
        };
      }
    }

    // Vérification des limites SMS mensuelles
    if (action === 'sms' || !action) {
      const monthlyLimit = custom_sms_limit || sms_credits_allocated || 0;
      
      // Vérifier d'abord les SMS du plan mensuel, puis les SMS achetés
      if (monthly_sms_used >= monthlyLimit && purchasedSmsAvailable <= 0) {
        const message = custom_sms_limit
          ? `Limite SMS mensuelle personnalisée atteinte (${monthly_sms_used}/${monthlyLimit}). Contactez le support.`
          : `Crédits SMS mensuels épuisés (${monthly_sms_used}/${monthlyLimit}). SMS achetés : ${purchasedSmsAvailable} disponibles.`;
          
        return { 
          allowed: false, 
          reason: message,
          action: custom_sms_limit ? 'contact_support' : 'buy_sms_package'
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