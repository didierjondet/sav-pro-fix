import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { useToast } from '@/hooks/use-toast';

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SupplierInput = Partial<Omit<Supplier, 'id' | 'shop_id' | 'created_at' | 'updated_at'>> & {
  name: string;
};

export function useSuppliersDirectory() {
  const { shop } = useShop();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const shopId = shop?.id;

  const queryKey = ['suppliers-directory', shopId];

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey,
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers' as any)
        .select('*')
        .eq('shop_id', shopId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Supplier[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const createSupplier = useMutation({
    mutationFn: async (input: SupplierInput): Promise<Supplier> => {
      if (!shopId) throw new Error('Shop introuvable');
      const { data, error } = await supabase
        .from('suppliers' as any)
        .insert([{ ...input, shop_id: shopId }])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Supplier;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Fournisseur créé' });
    },
    onError: (e: any) => {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...input }: SupplierInput & { id: string }) => {
      const { error } = await supabase
        .from('suppliers' as any)
        .update(input)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Fournisseur mis à jour' });
    },
    onError: (e: any) => {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Fournisseur supprimé' });
    },
    onError: (e: any) => {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    },
  });

  return {
    suppliers,
    activeSuppliers: suppliers.filter((s) => s.is_active),
    isLoading,
    createSupplier: createSupplier.mutateAsync,
    updateSupplier: updateSupplier.mutateAsync,
    deleteSupplier: deleteSupplier.mutateAsync,
  };
}
