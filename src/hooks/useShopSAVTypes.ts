import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ShopSAVType {
  id: string;
  shop_id: string;
  type_key: string;
  type_label: string;
  type_color: string;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  show_customer_info: boolean;
  max_processing_days?: number;
  alert_days?: number;
  pause_timer: boolean;
  show_in_sidebar: boolean;
  require_unlock_pattern: boolean;
  exclude_from_stats: boolean;
  exclude_purchase_costs: boolean;
  exclude_sales_revenue: boolean;
  show_satisfaction_survey: boolean;
  created_at: string;
  updated_at: string;
}

// Configuration de fallback pour les types par défaut
const defaultTypeConfig = {
  internal: { label: 'SAV INTERNE', color: '#3b82f6' },
  external: { label: 'SAV EXTERNE', color: '#10b981' },
  client: { label: 'SAV CLIENT', color: '#f59e0b' },
};

export function useShopSAVTypes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchTypes = async (): Promise<ShopSAVType[]> => {
    if (!user) return [];

    try {
      // Les politiques RLS se chargent automatiquement de filtrer par shop_id
      const { data, error } = await supabase
        .from('shop_sav_types')
        .select('*, alert_days, require_unlock_pattern, exclude_from_stats')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching shop SAV types:', error);
      return [];
    }
  };

  const { data: types = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['shop-sav-types', user?.id],
    queryFn: fetchTypes,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - données stables
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for SAV types
    const channel = supabase
      .channel('shop-sav-types-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_sav_types'
        },
        (payload) => {
          console.log('Shop SAV Type change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['shop-sav-types'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Fonction pour obtenir les informations d'un type
  const getTypeInfo = (typeKey: string) => {
    // Chercher d'abord dans les types personnalisés du magasin
    const customType = types.find(t => t.type_key === typeKey);
    if (customType) {
      return {
        label: customType.type_label,
        color: customType.type_color,
        show_customer_info: customType.show_customer_info,
        max_processing_days: customType.max_processing_days,
        pause_timer: customType.pause_timer,
        show_in_sidebar: customType.show_in_sidebar,
        require_unlock_pattern: customType.require_unlock_pattern,
        exclude_from_stats: customType.exclude_from_stats,
        exclude_purchase_costs: customType.exclude_purchase_costs,
        exclude_sales_revenue: customType.exclude_sales_revenue,
        show_satisfaction_survey: customType.show_satisfaction_survey ?? true,
      };
    }

    // Fallback vers la configuration par défaut
    const defaultConfig = defaultTypeConfig[typeKey as keyof typeof defaultTypeConfig];
    return {
      label: defaultConfig?.label || typeKey,
      color: defaultConfig?.color || '#6b7280',
      show_customer_info: true, // Par défaut, tous les types ont besoin d'infos client
      max_processing_days: 7,
      pause_timer: false,
      show_in_sidebar: true,
      require_unlock_pattern: false,
      exclude_from_stats: false,
      exclude_purchase_costs: false,
      exclude_sales_revenue: false,
      show_satisfaction_survey: true,
    };
  };

  // Fonction pour obtenir tous les types disponibles (personnalisés + par défaut)
  const getAllTypes = () => {
    if (types.length > 0) {
      // Retourner tous les types personnalisés du magasin
      return types.map(type => ({
        value: type.type_key,
        label: type.type_label,
        color: type.type_color
      }));
    }

    // Fallback vers les types par défaut si aucun type personnalisé
    return Object.entries(defaultTypeConfig).map(([key, config]) => ({
      value: key,
      label: config.label,
      color: config.color
    }));
  };

  // Fonction pour obtenir le style CSS pour un type
  const getTypeStyle = (typeKey: string) => {
    const typeInfo = getTypeInfo(typeKey);
    return {
      backgroundColor: `${typeInfo.color}20`, // 20% d'opacité pour le fond
      color: typeInfo.color,
      borderColor: typeInfo.color
    };
  };

  return {
    types,
    loading,
    getTypeInfo,
    getAllTypes,
    getTypeStyle,
    refetch
  };
}