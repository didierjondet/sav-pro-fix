import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentShop } from './useCurrentShop';

export interface SAVCase {
  id: string;
  case_number: string;
  tracking_slug?: string;
  sav_type: string;
  status: 'pending' | 'in_progress' | 'testing' | 'parts_ordered' | 'parts_received' | 'ready' | 'cancelled';
  device_brand: string;
  device_model: string;
  total_cost: number;
  created_at: string;
  customer?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

export function useOptimizedSAVCases(limit = 50, offset = 0, status?: string) {
  const { data: shopId } = useCurrentShop();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const casesQuery = useQuery({
    queryKey: ['sav-cases', shopId, limit, offset, status],
    queryFn: async () => {
      if (!shopId) throw new Error('No shop found');

      let query = supabase
        .from('sav_cases')
        .select(`
          id, 
          case_number, 
          tracking_slug,
          sav_type, 
          status, 
          device_brand, 
          device_model, 
          total_cost, 
          created_at,
          customer:customers(first_name, last_name, phone)
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SAVCase[] || [];
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2, // 2 minutes pour les données SAV
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ caseId, status }: { caseId: string; status: string }) => {
      const { error } = await supabase
        .from('sav_cases')
        .update({ status })
        .eq('id', caseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sav-cases', shopId] });
      toast({ title: "Succès", description: "Statut mis à jour" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erreur", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  return {
    cases: casesQuery.data || [],
    loading: casesQuery.isLoading,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    refetch: casesQuery.refetch,
  };
}