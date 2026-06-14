import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';

export interface GhostReservedPart {
  id: string;
  name: string;
  reference: string | null;
  sku: string | null;
  reserved_quantity: number;
  expected_reserved: number;
  ghost_units: number;
}

export function useGhostReservations() {
  const { shop } = useShop();
  const [ghostByPart, setGhostByPart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchGhosts = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_ghost_reserved_parts', { p_shop_id: shop.id });
      if (error) throw error;
      const map: Record<string, number> = {};
      (data as GhostReservedPart[] | null)?.forEach((p) => {
        if (p.ghost_units > 0) map[p.id] = p.ghost_units;
      });
      setGhostByPart(map);
    } catch (e) {
      console.error('useGhostReservations error', e);
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { fetchGhosts(); }, [fetchGhosts]);

  const recalculate = useCallback(async () => {
    if (!shop?.id) return { updated_parts: 0 };
    const { data, error } = await supabase.rpc('recalculate_part_reservations', { p_shop_id: shop.id });
    if (error) throw error;
    await fetchGhosts();
    return (data as { updated_parts: number }) ?? { updated_parts: 0 };
  }, [shop?.id, fetchGhosts]);

  return { ghostByPart, loading, refetch: fetchGhosts, recalculate };
}
