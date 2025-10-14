import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const fetchStatuses = async (): Promise<ShopSAVStatus[]> => {
    if (!user) return [];

    try {
      // Les politiques RLS se chargent automatiquement de filtrer par shop_id
      const { data, error } = await supabase
        .from('shop_sav_statuses')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching shop SAV statuses:', error);
      return [];
    }
  };

  const { data: statuses = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['shop-sav-statuses', user?.id],
    queryFn: fetchStatuses,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - données stables
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for SAV statuses
    const channel = supabase
      .channel('shop-sav-statuses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_sav_statuses'
        },
        (payload) => {
          console.log('Shop SAV Status change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['shop-sav-statuses'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

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

  // Fonction utilitaire pour détecter les statuts "prêt"
  const isReadyStatus = (statusKey: string) => {
    // Vérifier d'abord dans les statuts personnalisés
    const customStatus = statuses.find(s => s.status_key === statusKey);
    if (customStatus) {
      // Utiliser le label pour détecter si c'est un statut "prêt"
      const label = customStatus.status_label.toLowerCase();
      return label.includes('prêt') || label.includes('pret') || label.includes('ready') || label.includes('terminé') || label.includes('termine');
    }
    
    // Fallback sur les statuts par défaut
    const key = (statusKey || '').toLowerCase();
    return key === 'ready' || key === 'pret' || key === 'terminé' || key === 'termine';
  };

  // Fonction utilitaire pour détecter les statuts "annulé"
  const isCancelledStatus = (statusKey: string) => {
    // Vérifier d'abord dans les statuts personnalisés
    const customStatus = statuses.find(s => s.status_key === statusKey);
    if (customStatus) {
      const label = customStatus.status_label.toLowerCase();
      return label.includes('annulé') || label.includes('annule') || label.includes('cancelled') || label.includes('abandon');
    }
    
    // Fallback sur les statuts par défaut
    const key = (statusKey || '').toLowerCase();
    return key === 'cancelled' || key === 'annule' || key === 'annulé' || key === 'abandon';
  };

  // Fonction utilitaire pour détecter les statuts qui pausent le timer
  const isPauseTimerStatus = (statusKey: string) => {
    const customStatus = statuses.find(s => s.status_key === statusKey);
    return customStatus ? customStatus.pause_timer : false;
  };

  // Fonction utilitaire pour détecter les statuts actifs (ni prêt, ni annulé)
  const isActiveStatus = (statusKey: string) => {
    return !isReadyStatus(statusKey) && !isCancelledStatus(statusKey);
  };

  return {
    statuses,
    loading,
    getStatusInfo,
    getAllStatuses,
    getStatusStyle,
    isReadyStatus,
    isCancelledStatus,
    isPauseTimerStatus,
    isActiveStatus,
    refetch
  };
}