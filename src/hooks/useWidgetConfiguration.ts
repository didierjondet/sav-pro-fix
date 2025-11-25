import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { toast } from 'sonner';

export interface WidgetConfiguration {
  id: string;
  shop_id: string;
  widget_id: string;
  temporality: 'monthly' | 'quarterly' | 'yearly';
  sav_statuses_filter: string[] | null;
  sav_types_filter: string[] | null;
  created_at: string;
  updated_at: string;
}

export function useWidgetConfiguration(widgetId: string) {
  const { shop } = useShop();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['widget-configuration', shop?.id, widgetId],
    queryFn: async () => {
      if (!shop?.id) return null;

      const { data, error } = await supabase
        .from('widget_configurations')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('widget_id', widgetId)
        .maybeSingle();

      if (error) throw error;
      return data as WidgetConfiguration | null;
    },
    enabled: !!shop?.id && !!widgetId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (configData: Partial<WidgetConfiguration>) => {
      if (!shop?.id) throw new Error('Shop ID required');

      const { data, error } = await supabase
        .from('widget_configurations')
        .upsert({
          shop_id: shop.id,
          widget_id: widgetId,
          ...configData,
        }, {
          onConflict: 'shop_id,widget_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-configuration', shop?.id, widgetId] });
      toast.success('Configuration du widget enregistrée');
    },
    onError: (error) => {
      console.error('Error saving widget configuration:', error);
      toast.error('Erreur lors de la sauvegarde de la configuration');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.id) throw new Error('Shop ID required');

      const { error } = await supabase
        .from('widget_configurations')
        .delete()
        .eq('shop_id', shop.id)
        .eq('widget_id', widgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-configuration', shop?.id, widgetId] });
      toast.success('Configuration du widget supprimée');
    },
    onError: (error) => {
      console.error('Error deleting widget configuration:', error);
      toast.error('Erreur lors de la suppression de la configuration');
    },
  });

  return {
    config,
    isLoading,
    upsertConfig: upsertMutation.mutateAsync,
    deleteConfig: deleteMutation.mutateAsync,
  };
}
