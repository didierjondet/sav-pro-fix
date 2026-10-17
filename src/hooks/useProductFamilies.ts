import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_PRODUCT_FAMILIES } from '@/lib/productFamilies';

export interface ProductFamily {
  id: string;
  shop_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

const db = supabase as any;

export function useProductFamilies(options: { seed?: boolean } = {}) {
  const { shop } = useShop();
  const { toast } = useToast();
  const qc = useQueryClient();
  const shopId = shop?.id;
  const seeded = useRef(false);

  const query = useQuery({
    queryKey: ['product-families', shopId],
    enabled: !!shopId,
    placeholderData: (prev: ProductFamily[] | undefined) => prev,
    queryFn: async (): Promise<ProductFamily[]> => {
      const { data, error } = await db.from('product_families').select('*').eq('shop_id', shopId).order('display_order');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  // Familles par défaut à la première ouverture des paramètres
  useEffect(() => {
    if (!options.seed || !shopId || seeded.current || !query.isSuccess || (query.data?.length ?? 0) > 0) return;
    seeded.current = true;
    db.from('product_families')
      .insert(DEFAULT_PRODUCT_FAMILIES.map((f, i) => ({ shop_id: shopId, name: f.name, color: f.color, display_order: i })))
      .then(() => qc.invalidateQueries({ queryKey: ['product-families', shopId] }));
  }, [options.seed, shopId, query.isSuccess, query.data, qc]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['product-families', shopId] });
  const onError = (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' });

  const save = useMutation({
    mutationFn: async (input: Partial<ProductFamily> & { name: string }) => {
      const row = { name: input.name.trim(), color: input.color ?? null, icon: input.icon ?? null, display_order: input.display_order ?? 0 };
      const { error } = input.id
        ? await db.from('product_families').update(row).eq('id', input.id)
        : await db.from('product_families').insert({ ...row, shop_id: shopId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { invalidate(); toast({ title: 'Famille enregistrée' }); },
    onError,
  });

  const setActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db.from('product_families').update({ is_active }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => { invalidate(); toast({ title: v.is_active ? 'Famille réactivée' : 'Famille archivée' }); },
    onError,
  });

  const families = query.data ?? [];
  return {
    families,
    activeFamilies: families.filter((f) => f.is_active),
    loading: query.isLoading,
    saveFamily: save.mutateAsync,
    setFamilyActive: setActive.mutateAsync,
  };
}
