import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';

export interface PartCategory {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  color: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const categoriesTable = supabase.from('part_categories' as never) as unknown as {
  select: (cols: string) => {
    eq: (col: string, val: string) => {
      order: (col: string, opts: { ascending: boolean }) => Promise<{ data: PartCategory[] | null; error: { message: string } | null }>;
    };
  };
  insert: (values: Record<string, unknown>) => {
    select: () => { single: () => Promise<{ data: PartCategory | null; error: { message: string } | null }> };
  };
  update: (values: Record<string, unknown>) => {
    eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
  };
  delete: () => {
    eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
  };
};

export function usePartCategories() {
  const { shop } = useShop();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const shopId = shop?.id;

  const query = useQuery({
    queryKey: ['part-categories', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<PartCategory[]> => {
      const { data, error } = await categoriesTable
        .select('*')
        .eq('shop_id', shopId!)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['part-categories', shopId] });
    queryClient.invalidateQueries({ queryKey: ['parts', shopId] });
  };

  const createMutation = useMutation({
    mutationFn: async (input: { name: string; description?: string | null; color?: string | null; display_order?: number }) => {
      if (!shopId) throw new Error('Shop introuvable');
      const { data, error } = await categoriesTable
        .insert({
          shop_id: shopId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          color: input.color || null,
          display_order: input.display_order ?? 0,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Catégorie créée' });
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string | null; color?: string | null; display_order?: number }) => {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.description !== undefined) patch.description = input.description?.trim() || null;
      if (input.color !== undefined) patch.color = input.color || null;
      if (input.display_order !== undefined) patch.display_order = input.display_order;
      const { error } = await categoriesTable.update(patch).eq('id', input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Catégorie mise à jour' });
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await categoriesTable.delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Catégorie supprimée' });
    },
    onError: (error: Error) => toast({ title: 'Erreur', description: error.message, variant: 'destructive' }),
  });

  return {
    categories: query.data ?? [],
    loading: query.isLoading,
    createCategory: createMutation.mutateAsync,
    updateCategory: updateMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    refetch: query.refetch,
  };
}
