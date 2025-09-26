import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentShop } from './useCurrentShop';

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  shop_id: string;
  created_at: string;
  updated_at: string;
}

export function useOptimizedCustomers(limit = 100, offset = 0) {
  const { data: shopId } = useCurrentShop();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const customersQuery = useQuery({
    queryKey: ['customers', shopId, limit, offset],
    queryFn: async () => {
      if (!shopId) throw new Error('No shop found');

      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone, created_at')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'shop_id'>) => {
      if (!shopId) throw new Error('Shop non trouvé');

      // Validation rapide avec index optimisé
      const { data: duplicates } = await supabase
        .from('customers')
        .select('id')
        .eq('shop_id', shopId)
        .or(`and(first_name.ilike.${customerData.first_name},last_name.ilike.${customerData.last_name}),email.ilike.${customerData.email || ''}`)
        .limit(1);

      if (duplicates && duplicates.length > 0) {
        throw new Error('Client déjà existant');
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...customerData, shop_id: shopId }])
        .select('id, first_name, last_name, email, phone, created_at')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', shopId] });
      toast({ title: "Succès", description: "Client créé avec succès" });
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
    customers: customersQuery.data || [],
    loading: customersQuery.isLoading,
    createCustomer: createCustomerMutation.mutate,
    isCreating: createCustomerMutation.isPending,
    refetch: customersQuery.refetch,
  };
}