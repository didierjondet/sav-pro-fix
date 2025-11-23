import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DailyAssistantConfig {
  id?: string;
  shop_id: string;
  sav_statuses_included: string[];
  sav_types_included: string[] | null;
  min_sav_age_days: number;
  late_threshold_days: number;
  low_stock_threshold: number;
  analysis_priority: 'revenue' | 'satisfaction' | 'productivity' | 'balanced';
  tone: 'professional' | 'motivating' | 'concise' | 'detailed';
  sections_enabled: {
    daily_priorities: boolean;
    quick_actions: boolean;
    parts_management: boolean;
    productivity_tips: boolean;
    revenue_optimization: boolean;
  };
  top_items_count: number;
}

const DEFAULT_CONFIG: Omit<DailyAssistantConfig, 'id' | 'shop_id'> = {
  sav_statuses_included: ['pending', 'in_progress', 'parts_ordered', 'testing'],
  sav_types_included: null,
  min_sav_age_days: 0,
  late_threshold_days: 3,
  low_stock_threshold: 5,
  analysis_priority: 'balanced',
  tone: 'professional',
  sections_enabled: {
    daily_priorities: true,
    quick_actions: true,
    parts_management: true,
    productivity_tips: true,
    revenue_optimization: true,
  },
  top_items_count: 5,
};

export function useDailyAssistantConfig(shopId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['daily-assistant-config', shopId],
    queryFn: async () => {
      if (!shopId) return null;

      const { data, error } = await supabase
        .from('daily_assistant_config')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();

      if (error) throw error;
      
      // Cast through unknown to handle Json type from Supabase
      return data ? (data as unknown as DailyAssistantConfig) : null;
    },
    enabled: !!shopId,
  });

  const updateMutation = useMutation({
    mutationFn: async (newConfig: Partial<DailyAssistantConfig>) => {
      if (!shopId) throw new Error('Shop ID required');

      const configData = {
        shop_id: shopId,
        ...newConfig,
      };

      const { data, error } = await supabase
        .from('daily_assistant_config')
        .upsert(configData, { onConflict: 'shop_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-assistant-config', shopId] });
      toast({
        title: 'Configuration sauvegardée',
        description: 'Les paramètres de l\'assistant ont été mis à jour',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('Shop ID required');

      const { error } = await supabase
        .from('daily_assistant_config')
        .delete()
        .eq('shop_id', shopId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-assistant-config', shopId] });
      toast({
        title: 'Configuration réinitialisée',
        description: 'Les paramètres par défaut ont été restaurés',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const effectiveConfig: DailyAssistantConfig = config
    ? config
    : { ...DEFAULT_CONFIG, shop_id: shopId || '', id: undefined };

  return {
    config: effectiveConfig,
    isLoading,
    updateConfig: updateMutation.mutate,
    resetConfig: resetMutation.mutate,
    isUpdating: updateMutation.isPending || resetMutation.isPending,
  };
}
