import { useState, useEffect } from 'react';
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
}

interface SubscriptionFeatures {
  menuConfig: MenuConfig | null;
  planName: string;
  loading: boolean;
}

export function useSubscriptionFeatures(): SubscriptionFeatures {
  const { shop, loading: shopLoading } = useShop();
  const [features, setFeatures] = useState<SubscriptionFeatures>({
    menuConfig: null,
    planName: '',
    loading: true
  });

  useEffect(() => {
    if (!shop || shopLoading) {
      setFeatures(prev => ({ ...prev, loading: shopLoading }));
      return;
    }

    const fetchPlanFeatures = async () => {
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
          setFeatures({
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
              statistics: false
            },
            planName: shop.subscription_tier || 'free',
            loading: false
          });
          return;
        }

        setFeatures({
          menuConfig: plan?.menu_config || null,
          planName: plan?.name || shop.subscription_tier || 'free',
          loading: false
        });
      } catch (error) {
        console.error('Error in fetchPlanFeatures:', error);
        setFeatures(prev => ({ ...prev, loading: false }));
      }
    };

    fetchPlanFeatures();
  }, [shop, shopLoading]);

  return features;
}