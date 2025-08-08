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
      // Get current shop data for limits and subscription plan
      const { data: profileData } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      if (profileData?.shop_id) {
        const { data: shopData } = await supabase
          .from('shops')
          .select(`
            subscription_tier, 
            sms_credits_allocated, 
            sms_credits_used, 
            active_sav_count,
            subscription_plan_id,
            subscription_forced,
            subscription_plans!inner(
              name,
              sms_limit,
              sms_cost,
              sav_limit,
              monthly_price
            )
          `)
          .eq('id', profileData.shop_id)
          .single();

        if (shopData && shopData.subscription_plans) {
          const plan = shopData.subscription_plans;
          
          // Si l'abonnement est forcé, ne pas vérifier Stripe
          if (shopData.subscription_forced) {
            setSubscription({
              subscribed: true,
              subscription_tier: plan.name.toLowerCase() as 'free' | 'premium' | 'enterprise',
              subscription_end: null,
              sms_credits_allocated: plan.sms_limit || 15,
              sms_credits_used: shopData.sms_credits_used || 0,
              active_sav_count: shopData.active_sav_count || 0,
            });
            return;
          }
          
          // Sinon, vérifier via Stripe
          try {
            const { data, error } = await supabase.functions.invoke('check-subscription');
            
            if (error) {
              console.warn('Stripe verification failed, using forced subscription data');
              // En cas d'erreur Stripe, utiliser les données locales
              setSubscription({
                subscribed: true,
                subscription_tier: plan.name.toLowerCase() as 'free' | 'premium' | 'enterprise',
                subscription_end: null,
                sms_credits_allocated: plan.sms_limit || 15,
                sms_credits_used: shopData.sms_credits_used || 0,
                active_sav_count: shopData.active_sav_count || 0,
              });
              return;
            }
            
            setSubscription({
              subscribed: data.subscribed || false,
              subscription_tier: plan.name.toLowerCase() as 'free' | 'premium' | 'enterprise',
              subscription_end: data.subscription_end,
              sms_credits_allocated: plan.sms_limit || 15,
              sms_credits_used: shopData.sms_credits_used || 0,
              active_sav_count: shopData.active_sav_count || 0,
            });
          } catch (stripeError) {
            console.warn('Stripe API unavailable, using local subscription data');
            // En cas d'erreur Stripe, utiliser les données locales sans toast d'erreur
            setSubscription({
              subscribed: true,
              subscription_tier: plan.name.toLowerCase() as 'free' | 'premium' | 'enterprise',
              subscription_end: null,
              sms_credits_allocated: plan.sms_limit || 15,
              sms_credits_used: shopData.sms_credits_used || 0,
              active_sav_count: shopData.active_sav_count || 0,
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      // Ne plus afficher le toast d'erreur pour éviter de spammer l'utilisateur
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
      return { allowed: false, reason: "Données d'abonnement non disponibles" };
    }

    const { subscription_tier, sms_credits_used, sms_credits_allocated, active_sav_count } = subscription;

    // Vérification des limites SAV basées sur le plan - plus souple pour les abonnements forcés
    if (action === 'sav' || !action) {
      if (subscription_tier === 'free' && active_sav_count >= 25) { // Augmenté de 15 à 25
        return { allowed: false, reason: "Plan Gratuit limité à 25 SAV actifs" };
      }
      if (subscription_tier === 'premium' && active_sav_count >= 50) { // Augmenté de 10 à 50
        return { allowed: false, reason: "Plan Premium limité à 50 SAV simultanés" };
      }
      // Enterprise = illimité
    }

    // Vérification des limites SMS basées sur le plan - plus souple
    if (action === 'sms' || !action) {
      const smsUsed = sms_credits_used || 0;
      const smsAllocated = sms_credits_allocated || 0;
      
      // Plus de souplesse pour les SMS aussi
      if (smsUsed >= (smsAllocated * 1.2)) { // 20% de dépassement autorisé
        return { 
          allowed: false, 
          reason: `Limite SMS dépassée (${smsUsed}/${smsAllocated})` 
        };
      }
    }

    return { allowed: true, reason: "Dans les limites autorisées" };
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