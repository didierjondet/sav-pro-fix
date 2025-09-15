import { useState, useEffect } from 'react';
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
  const [types, setTypes] = useState<ShopSAVType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTypes();
      
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
            // Refetch types when any change occurs
            fetchTypes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Pour les utilisateurs non connectés (page publique), utiliser les types par défaut
      setLoading(false);
    }
  }, [user]);

  const fetchTypes = async () => {
    try {
      // Les politiques RLS se chargent automatiquement de filtrer par shop_id
      const { data, error } = await supabase
        .from('shop_sav_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTypes(data || []);
    } catch (error: any) {
      console.error('Error fetching shop SAV types:', error);
      // En cas d'erreur, utiliser les types par défaut
      setTypes([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir les informations d'un type
  const getTypeInfo = (typeKey: string) => {
    // Chercher d'abord dans les types personnalisés du magasin
    const customType = types.find(t => t.type_key === typeKey);
    if (customType) {
      return {
        label: customType.type_label,
        color: customType.type_color,
      };
    }

    // Fallback vers la configuration par défaut
    const defaultConfig = defaultTypeConfig[typeKey as keyof typeof defaultTypeConfig];
    return {
      label: defaultConfig?.label || typeKey,
      color: defaultConfig?.color || '#6b7280',
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
    refetch: fetchTypes
  };
}