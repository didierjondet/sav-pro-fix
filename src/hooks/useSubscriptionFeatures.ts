import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';

interface MenuConfig {
  dashboard: boolean;
  sav: boolean;
  parts: boolean;
  quotes: boolean;
  orders: boolean;
  customers: boolean;
  chats: boolean;
  sidebar_sav_types: boolean;
  sidebar_sav_statuses: boolean;
  sidebar_late_sav: boolean;
  statistics: boolean;
  reports?: boolean;
}

interface SubscriptionFeatures {
  menuConfig: MenuConfig | null;
  planName: string;
  loading: boolean;
}

export function useSubscriptionFeatures(): SubscriptionFeatures {
  const { shop, loading: shopLoading } = useShop();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-features', shop?.id, shop?.subscription_plan_id, shop?.subscription_tier],
    queryFn: async () => {
      if (!shop) return null;

      try {
        let planQuery;
        
        // Si le shop a un plan spécifique, l'utiliser
        if (shop.subscription_plan_id) {
          planQuery = supabase
            .from('subscription_plans')
            .select('menu_config, name')
            .eq('id', shop.subscription_plan_id)
            .single();
        } else {
          // Sinon, chercher le plan par défaut basé sur le tier
          planQuery = supabase
            .from('subscription_plans')
            .select('menu_config, name')
            .ilike('name', shop.subscription_tier || 'free')
            .eq('is_active', true)
            .single();
        }

        const { data: plan, error } = await planQuery;

        if (error) {
          console.error('Error fetching subscription plan:', error);
          // Plan par défaut en cas d'erreur
          return {
            menuConfig: {
              dashboard: true,
              sav: true,
              parts: true,
              quotes: false,
              orders: false,
              customers: true,
              chats: false,
              sidebar_sav_types: true,
              sidebar_sav_statuses: true,
              sidebar_late_sav: true,
              statistics: false,
              reports: true
            },
            planName: shop.subscription_tier || 'free'
          };
        }

        return {
          menuConfig: plan?.menu_config || null,
          planName: plan?.name || shop.subscription_tier || 'free'
        };
      } catch (error) {
        console.error('Error in fetchPlanFeatures:', error);
        return null;
      }
    },
    enabled: !!shop && !shopLoading,
    staleTime: 30 * 60 * 1000, // 30 minutes - les plans changent rarement
    gcTime: 60 * 60 * 1000, // 1 heure en cache
  });

  return {
    menuConfig: data?.menuConfig || null,
    planName: data?.planName || '',
    loading: shopLoading || isLoading
  };
}