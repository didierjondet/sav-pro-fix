import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnifiedSMSCredits {
  // Données shop
  shop_id: string | null;
  subscription_tier: string;
  
  // 1. Crédits mensuels du plan (remis à zéro chaque mois)
  monthly_allocated: number;
  monthly_used: number;
  monthly_remaining: number;
  monthly_usage_percent: number;
  
  // 2. Crédits achetés + ajoutés par admin (épuisables sans limite de temps)
  purchased_total: number;        // SMS achetés via packages
  admin_added: number;           // SMS ajoutés par super admin
  purchasable_total: number;     // purchased + admin_added
  purchasable_used: number;      // consommés des crédits épuisables
  purchasable_remaining: number; // restants des crédits épuisables
  
  // 3. Totaux généraux
  total_available: number;    // monthly + purchasable
  total_remaining: number;    // monthly_remaining + purchasable_remaining
  overall_usage_percent: number;
  
  // 4. Statuts d'alerte
  is_warning: boolean;    // >80% global
  is_critical: boolean;   // >95% global et plus de crédits épuisables
  is_exhausted: boolean;  // 0 crédit restant
  
  // 5. Flags d'affichage
  has_purchased_credits: boolean; // Si le magasin a acheté/reçu des crédits épuisables
}

export function useUnifiedSMSCredits() {
  const { user } = useAuth();
  
  const { data: credits, isLoading: loading, refetch: refreshCredits } = useQuery({
    queryKey: ['sms-credits', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Récupérer le shop de l'utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.shop_id) {
        return null;
      }

      // Utiliser la nouvelle fonction pour récupérer la répartition des crédits
      const { data: breakdown, error: breakdownError } = await supabase
        .rpc('get_sms_credits_breakdown', { p_shop_id: profile.shop_id });

      if (breakdownError) throw breakdownError;

      if (!breakdown || breakdown.length === 0) {
        return null;
      }

      const credits = breakdown[0];
      
      // Récupérer le tier d'abonnement
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('subscription_tier')
        .eq('id', profile.shop_id)
        .single();

      if (shopError) throw shopError;

      // Calculer les pourcentages
      const monthly_usage_percent = credits.monthly_allocated > 0 
        ? Math.round((credits.monthly_used / credits.monthly_allocated) * 100)
        : 0;
      
      // Calcul corrigé du pourcentage global d'utilisation
      const total_used = credits.monthly_used + credits.purchased_and_admin_used;
      const overall_usage_percent = credits.total_available > 0 
        ? Math.round((total_used / credits.total_available) * 100)
        : 0;

      // Statuts d'alerte
      const is_warning = overall_usage_percent >= 80 && overall_usage_percent < 95;
      const is_critical = overall_usage_percent >= 95 && credits.purchased_and_admin_remaining <= 0;
      const is_exhausted = credits.total_remaining <= 0;

      // Flag pour savoir si le magasin a des crédits épuisables
      const has_purchased_credits = (credits.purchased_total + credits.admin_added) > 0;

      return {
        shop_id: profile.shop_id,
        subscription_tier: shop?.subscription_tier || 'free',
        
        // Crédits mensuels (plan)
        monthly_allocated: credits.monthly_allocated,
        monthly_used: credits.monthly_used,
        monthly_remaining: credits.monthly_remaining,
        monthly_usage_percent,
        
        // Crédits épuisables (achetés + admin)
        purchased_total: credits.purchased_total,
        admin_added: credits.admin_added,
        purchasable_total: credits.purchased_total + credits.admin_added,
        purchasable_used: credits.purchased_and_admin_used,
        purchasable_remaining: credits.purchased_and_admin_remaining,
        
        // Totaux
        total_available: credits.total_available,
        total_remaining: credits.total_remaining,
        overall_usage_percent,
        
        // Alertes
        is_warning,
        is_critical,
        is_exhausted,
        
        // Flags d'affichage
        has_purchased_credits
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    credits: credits ?? null,
    loading,
    refreshCredits,
  };
}