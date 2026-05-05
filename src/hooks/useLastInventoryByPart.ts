import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';

export interface LastInventoryInfo {
  lastCountedAt: string;
  sessionId: string;
  sessionName: string;
  sessionStatus: string;
}

export function useLastInventoryByPart() {
  const { shop } = useShop();

  const query = useQuery({
    queryKey: ['last-inventory-by-part', shop?.id],
    enabled: !!shop?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_session_items')
        .select('part_id, counted_at, inventory_session_id, inventory_sessions!inner(id, name, status)')
        .eq('shop_id', shop!.id)
        .not('counted_at', 'is', null)
        .in('inventory_sessions.status', ['completed', 'applied'])
        .order('counted_at', { ascending: false });

      if (error) throw error;

      const map = new Map<string, LastInventoryInfo>();
      (data ?? []).forEach((row: any) => {
        if (!row.part_id || map.has(row.part_id)) return;
        map.set(row.part_id, {
          lastCountedAt: row.counted_at,
          sessionId: row.inventory_session_id,
          sessionName: row.inventory_sessions?.name ?? 'Inventaire',
          sessionStatus: row.inventory_sessions?.status ?? '',
        });
      });
      return map;
    },
  });

  return {
    lastInventoryByPart: query.data ?? new Map<string, LastInventoryInfo>(),
    loading: query.isLoading,
  };
}
