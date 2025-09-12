import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ShopSAVStatus {
  id: string;
  shop_id: string;
  status_key: string;
  status_label: string;
  status_color: string;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  pause_timer: boolean;
  show_in_sidebar: boolean;
  created_at: string;
  updated_at: string;
}

// Configuration de fallback pour les statuts par défaut
const defaultStatusConfig = {
  pending: { label: 'En attente', color: '#6b7280', variant: 'secondary' as const },
  in_progress: { label: 'En cours', color: '#3b82f6', variant: 'default' as const },
  testing: { label: 'Tests', color: '#8b5cf6', variant: 'default' as const },
  parts_ordered: { label: 'Pièces commandées', color: '#f59e0b', variant: 'outline' as const },
  parts_received: { label: 'Pièces réceptionnées', color: '#22c55e', variant: 'default' as const },
  ready: { label: 'Prêt', color: '#10b981', variant: 'default' as const },
  cancelled: { label: 'Annulé', color: '#ef4444', variant: 'destructive' as const },
};

export function useShopSAVStatuses() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<ShopSAVStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStatuses();
    } else {
      // Pour les utilisateurs non connectés (page publique), utiliser les statuts par défaut
      setLoading(false);
    }
  }, [user]);

  const fetchStatuses = async () => {
    try {
      // Les politiques RLS se chargent automatiquement de filtrer par shop_id
      const { data, error } = await supabase
        .from('shop_sav_statuses')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setStatuses(data || []);
    } catch (error: any) {
      console.error('Error fetching shop SAV statuses:', error);
      // En cas d'erreur, utiliser les statuts par défaut
      setStatuses([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir les informations d'un statut
  const getStatusInfo = (statusKey: string) => {
    // Chercher d'abord dans les statuts personnalisés du magasin
    const customStatus = statuses.find(s => s.status_key === statusKey);
    if (customStatus) {
      return {
        label: customStatus.status_label,
        color: customStatus.status_color,
        variant: 'default' as const,
        pause_timer: customStatus.pause_timer
      };
    }

    // Fallback vers la configuration par défaut
    const defaultConfig = defaultStatusConfig[statusKey as keyof typeof defaultStatusConfig];
    return {
      label: defaultConfig?.label || statusKey,
      color: defaultConfig?.color || '#6b7280',
      variant: defaultConfig?.variant || 'secondary' as const,
      pause_timer: false // Les statuts par défaut n'ont pas pause_timer
    };
  };

  // Fonction pour obtenir tous les statuts disponibles (personnalisés + par défaut)
  const getAllStatuses = () => {
    if (statuses.length > 0) {
      // Utiliser les statuts personnalisés du magasin
      return statuses.map(status => ({
        value: status.status_key,
        label: status.status_label,
        color: status.status_color
      }));
    }

    // Fallback vers les statuts par défaut
    return Object.entries(defaultStatusConfig).map(([key, config]) => ({
      value: key,
      label: config.label,
      color: config.color
    }));
  };

  // Fonction pour obtenir le style CSS pour un statut
  const getStatusStyle = (statusKey: string) => {
    const statusInfo = getStatusInfo(statusKey);
    return {
      backgroundColor: `${statusInfo.color}20`, // 20% d'opacité pour le fond
      color: statusInfo.color,
      borderColor: statusInfo.color
    };
  };

  return {
    statuses,
    loading,
    getStatusInfo,
    getAllStatuses,
    getStatusStyle,
    refetch: fetchStatuses
  };
}