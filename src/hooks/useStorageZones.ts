import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';

export interface StorageZone {
  id: string;
  shop_id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  parent_id: string | null;
  sort_order: number;
  part_count?: number;
}

export interface StorageZoneInput {
  name: string;
  code: string;
  description?: string | null;
  color?: string;
  parent_id?: string | null;
}

/** Normalise un code de zone : majuscules, sans espaces superflus. */
export function normalizeZoneCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '-');
}

/** Libellé complet "Parent › Zone" pour affichage. */
export function zonePath(zone: StorageZone, byId: Map<string, StorageZone>) {
  const names: string[] = [zone.name];
  let cur = zone.parent_id ? byId.get(zone.parent_id) : undefined;
  let guard = 0;
  while (cur && guard++ < 10) {
    names.unshift(cur.name);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return names.join(' › ');
}

const db = supabase as any;

export function useStorageZones() {
  const { shop } = useShop();
  const shopId = shop?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['storage-zones', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<StorageZone[]> => {
      const [{ data, error }, { data: counts }] = await Promise.all([
        db.from('storage_zones').select('*').eq('shop_id', shopId).order('sort_order').order('code'),
        db.from('parts').select('storage_zone_id').eq('shop_id', shopId).not('storage_zone_id', 'is', null),
      ]);
      if (error) throw new Error(error.message);
      const countMap = new Map<string, number>();
      (counts ?? []).forEach((r: any) => countMap.set(r.storage_zone_id, (countMap.get(r.storage_zone_id) ?? 0) + 1));
      return (data ?? []).map((z: StorageZone) => ({ ...z, part_count: countMap.get(z.id) ?? 0 }));
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['storage-zones', shopId] });
    qc.invalidateQueries({ queryKey: ['parts', shopId] });
  };

  const onError = (e: Error) => {
    const msg = /duplicate|unique/i.test(e.message) ? 'Ce code de zone existe déjà.' : e.message;
    toast({ title: 'Erreur', description: msg, variant: 'destructive' });
  };

  const clean = (i: StorageZoneInput) => ({
    name: i.name.trim(),
    code: normalizeZoneCode(i.code),
    description: i.description?.trim() || null,
    color: i.color || '#3b82f6',
    parent_id: i.parent_id || null,
  });

  const create = useMutation({
    mutationFn: async (input: StorageZoneInput): Promise<StorageZone> => {
      if (!shopId) throw new Error('Magasin introuvable');
      const { data, error } = await db.from('storage_zones').insert({ shop_id: shopId, ...clean(input) }).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (z) => { invalidate(); toast({ title: 'Zone créée', description: `${z.code} — ${z.name}` }); },
    onError,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: StorageZoneInput & { id: string }): Promise<StorageZone> => {
      const { data, error } = await db.from('storage_zones').update(clean(input)).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Zone modifiée' }); },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('storage_zones').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { invalidate(); toast({ title: 'Zone supprimée', description: 'Les pièces concernées sont maintenant « Sans zone ».' }); },
    onError,
  });

  const assignParts = useMutation({
    mutationFn: async ({ partIds, zoneId }: { partIds: string[]; zoneId: string | null }) => {
      const { error } = await db.from('parts').update({ storage_zone_id: zoneId }).in('id', partIds);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError,
  });

  return {
    zones: query.data ?? [],
    loading: query.isLoading,
    createZone: create.mutateAsync,
    updateZone: update.mutateAsync,
    deleteZone: remove.mutateAsync,
    assignParts: assignParts.mutateAsync,
  };
}
