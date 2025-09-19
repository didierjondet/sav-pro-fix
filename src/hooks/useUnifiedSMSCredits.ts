import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnifiedSMSCredits {
  // Données shop
  shop_id: string | null;
  subscription_tier: string;
  
  // Crédits mensuels du plan
  monthly_sms_allocated: number;
  monthly_sms_used: number;
  monthly_remaining: number;
  
  // Crédits achetés via packages
  purchased_sms_total: number;
  purchased_sms_used: number;
  purchased_remaining: number;
  
  // Total général
  total_available: number;
  total_remaining: number;
  
  // Pourcentages d'utilisation
  monthly_usage_percent: number;
  overall_usage_percent: number;
  
  // Statuts d'alerte
  is_warning: boolean; // >80%
  is_critical: boolean; // >95% et plus de crédits achetés
  is_exhausted: boolean; // 0 crédit restant
}

export function useUnifiedSMSCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UnifiedSMSCredits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUnifiedCredits();
    } else {
      setCredits(null);
      setLoading(false);
    }
  }, [user]);

  const fetchUnifiedCredits = async () => {
    if (!user) return;
    
    try {
      // Récupérer le shop de l'utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.shop_id) {
        setCredits(null);
        return;
      }

      // Récupérer les données du shop
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select(`
          subscription_tier,
          sms_credits_allocated,
          monthly_sms_used,
          purchased_sms_credits,
          custom_sms_limit
        `)
        .eq('id', profile.shop_id)
        .single();

      if (shopError) throw shopError;

      // Calculer les crédits achetés via packages
      const { data: packages, error: packagesError } = await supabase
        .from('sms_package_purchases')
        .select('sms_count')
        .eq('shop_id', profile.shop_id)
        .eq('status', 'completed');

      if (packagesError) throw packagesError;

      const purchased_sms_total = packages?.reduce((sum, pkg) => sum + pkg.sms_count, 0) || 0;
      const purchased_sms_used = shop?.purchased_sms_credits || 0;
      const purchased_remaining = Math.max(0, purchased_sms_total - purchased_sms_used);

      // Crédits mensuels du plan
      const monthly_sms_allocated = shop?.custom_sms_limit || shop?.sms_credits_allocated || 0;
      const monthly_sms_used = shop?.monthly_sms_used || 0;
      const monthly_remaining = Math.max(0, monthly_sms_allocated - monthly_sms_used);

      // Totaux
      const total_available = monthly_sms_allocated + purchased_sms_total;
      const total_remaining = monthly_remaining + purchased_remaining;

      // Pourcentages
      const monthly_usage_percent = monthly_sms_allocated > 0 
        ? Math.round((monthly_sms_used / monthly_sms_allocated) * 100)
        : 0;
      
      const overall_usage_percent = total_available > 0 
        ? Math.round(((monthly_sms_used + purchased_sms_used) / total_available) * 100)
        : 0;

      // Statuts d'alerte
      const is_warning = overall_usage_percent >= 80 && overall_usage_percent < 95;
      const is_critical = overall_usage_percent >= 95 && purchased_remaining <= 0;
      const is_exhausted = total_remaining <= 0;

      setCredits({
        shop_id: profile.shop_id,
        subscription_tier: shop?.subscription_tier || 'free',
        monthly_sms_allocated,
        monthly_sms_used,
        monthly_remaining,
        purchased_sms_total,
        purchased_sms_used,
        purchased_remaining,
        total_available,
        total_remaining,
        monthly_usage_percent,
        overall_usage_percent,
        is_warning,
        is_critical,
        is_exhausted
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des crédits SMS unifiés:', error);
      setCredits(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshCredits = () => {
    fetchUnifiedCredits();
  };

  return {
    credits,
    loading,
    refreshCredits,
  };
}