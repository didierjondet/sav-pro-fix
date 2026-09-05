import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShopConfigProgress {
  shopId: string;
  doneCount: number;
  totalSteps: number;
  percent: number;
}

function toProgress(row: any): ShopConfigProgress {
  const done = Number(row?.done_count ?? 0);
  const total = Number(row?.total_steps ?? 13) || 13;
  return {
    shopId: row?.shop_id,
    doneCount: done,
    totalSteps: total,
    percent: Math.round((done / total) * 100),
  };
}

/** Progression de configuration (13 étapes) pour un magasin donné — usage Super Admin */
export function useShopConfigProgress(shopId?: string) {
  return useQuery({
    queryKey: ['shop-config-progress', shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    queryFn: async (): Promise<ShopConfigProgress | null> => {
      if (!shopId) return null;
      const { data, error } = await supabase.rpc('get_shops_config_progress' as any, {
        _shop_ids: [shopId],
      });
      if (error) throw error;
      const row = (data as any[])?.[0];
      return row ? toProgress(row) : null;
    },
  });
}

/** Progression de configuration pour une liste de magasins (cartes Super Admin) */
export function useShopsConfigProgress(shopIds: string[]) {
  const key = [...shopIds].sort().join(',');
  return useQuery({
    queryKey: ['shops-config-progress', key],
    enabled: shopIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, ShopConfigProgress>> => {
      const { data, error } = await supabase.rpc('get_shops_config_progress' as any, {
        _shop_ids: shopIds,
      });
      if (error) throw error;
      const map: Record<string, ShopConfigProgress> = {};
      (data as any[] | null)?.forEach((row) => {
        const p = toProgress(row);
        if (p.shopId) map[p.shopId] = p;
      });
      return map;
    },
  });
}
