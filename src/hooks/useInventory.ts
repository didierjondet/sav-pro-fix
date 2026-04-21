import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import { useProfile } from '@/hooks/useProfile';
import type {
  InventoryAuditLog,
  InventoryMode,
  InventorySession,
  InventorySessionItem,
} from '@/components/settings/inventory/types';

interface UpdateInventoryItemInput {
  sessionId: string;
  itemId: string;
  countedQuantity?: number | null;
  lineStatus?: InventorySessionItem['line_status'];
  entryMethod?: InventoryMode;
  lastScannedCode?: string | null;
  scanCount?: number;
  notes?: string | null;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export function useInventory() {
  const { shop } = useShop();
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const shopId = shop?.id;

  const sessionsQuery = useQuery({
    queryKey: ['inventory-sessions', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<InventorySession[]> => {
      const { data, error } = await supabase
        .from('inventory_sessions' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as InventorySession[];
    },
  });

  const sessionId = selectedSessionId ?? sessionsQuery.data?.[0]?.id ?? null;

  const sessionQuery = useQuery({
    queryKey: ['inventory-session', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<InventorySession | null> => {
      const { data, error } = await supabase
        .from('inventory_sessions' as any)
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (error) throw error;
      return (data as InventorySession) || null;
    },
  });

  const itemsQuery = useQuery({
    queryKey: ['inventory-items', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<InventorySessionItem[]> => {
      const { data, error } = await supabase
        .from('inventory_session_items' as any)
        .select('*')
        .eq('inventory_session_id', sessionId)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data || []) as InventorySessionItem[];
    },
  });

  const logsQuery = useQuery({
    queryKey: ['inventory-logs', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<InventoryAuditLog[]> => {
      const { data, error } = await supabase
        .from('inventory_audit_logs' as any)
        .select('*')
        .eq('inventory_session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as InventoryAuditLog[];
    },
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['inventory-sessions', shopId] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-session', sessionId] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-items', sessionId] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-logs', sessionId] }),
      queryClient.invalidateQueries({ queryKey: ['parts', shopId] }),
    ]);
  };

  const addAuditLog = async (payload: Partial<InventoryAuditLog> & { action: string; inventory_session_id: string }) => {
    if (!shopId) return;

    await supabase.from('inventory_audit_logs' as any).insert({
      shop_id: shopId,
      changed_by_profile_id: profile?.id ?? null,
      changed_by_name:
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || 'Utilisateur',
      metadata: {},
      ...payload,
    });
  };

  const createSession = async ({ name, mode, notes }: { name: string; mode: InventoryMode; notes?: string }) => {
    try {
      const { data, error } = await supabase.rpc('begin_inventory_session' as any, {
        _name: name,
        _mode: mode,
        _notes: notes || null,
      });

      if (error) throw error;
      setSelectedSessionId(data as string);
      await refreshAll();
      toast({ title: 'Inventaire lancé', description: 'La session a été créée avec son instantané de stock.' });
      return data as string;
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const updateSession = async (id: string, patch: Partial<InventorySession>, action?: string, metadata?: Record<string, unknown>) => {
    const previous = sessionQuery.data;
    const { error } = await supabase.from('inventory_sessions' as any).update(patch).eq('id', id);
    if (error) throw error;
    if (action) {
      await addAuditLog({
        inventory_session_id: id,
        action,
        old_value: previous?.status ?? null,
        new_value: typeof patch.status === 'string' ? patch.status : null,
        metadata: metadata || {},
      });
    }
    await refreshAll();
  };

  const updateItem = async ({ sessionId, itemId, ...input }: UpdateInventoryItemInput) => {
    const item = itemsQuery.data?.find((entry) => entry.id === itemId);
    const nextPayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.countedQuantity !== undefined) nextPayload.counted_quantity = input.countedQuantity;
    if (input.lineStatus) nextPayload.line_status = input.lineStatus;
    if (input.entryMethod) nextPayload.entry_method = input.entryMethod;
    if (input.lastScannedCode !== undefined) nextPayload.last_scanned_code = input.lastScannedCode;
    if (input.scanCount !== undefined) nextPayload.scan_count = input.scanCount;
    if (input.notes !== undefined) nextPayload.notes = input.notes;

    const { error } = await supabase
      .from('inventory_session_items' as any)
      .update(nextPayload)
      .eq('id', itemId)
      .eq('inventory_session_id', sessionId);

    if (error) throw error;

    await addAuditLog({
      inventory_session_id: sessionId,
      inventory_session_item_id: itemId,
      action: 'item_updated',
      old_value: JSON.stringify({
        counted_quantity: item?.counted_quantity ?? null,
        line_status: item?.line_status ?? null,
      }),
      new_value: JSON.stringify({
        counted_quantity: input.countedQuantity ?? item?.counted_quantity ?? null,
        line_status: input.lineStatus ?? item?.line_status ?? null,
      }),
      metadata: {
        item_name: item?.part_name,
        entry_method: input.entryMethod ?? item?.entry_method,
      },
    });

    await refreshAll();
  };

  const bulkScanCodes = async (sessionId: string, codes: string[]) => {
    const items = itemsQuery.data || [];
    const counts = new Map<string, number>();
    const originals = new Map(items.map((item) => [item.id, item]));

    codes
      .map(normalizeCode)
      .filter(Boolean)
      .forEach((code) => counts.set(code, (counts.get(code) || 0) + 1));

    const unknownCodes: string[] = [];
    const updates: Promise<unknown>[] = [];

    for (const [code, increment] of counts.entries()) {
      const match = items.find((item) => normalizeCode(item.part_sku || '') === code);
      if (!match) {
        unknownCodes.push(code);
        continue;
      }

      const nextQuantity = (match.counted_quantity ?? 0) + increment;
      updates.push(
        supabase
          .from('inventory_session_items' as any)
          .update({
            counted_quantity: nextQuantity,
            line_status: nextQuantity === match.expected_quantity ? 'found' : 'adjusted',
            entry_method: 'scan',
            last_scanned_code: code,
            scan_count: (match.scan_count || 0) + increment,
          })
          .eq('id', match.id)
          .eq('inventory_session_id', sessionId),
      );
    }

    const results = await Promise.all(updates);
    const failed = results.find((result: any) => result.error);
    if (failed && (failed as any).error) throw (failed as any).error;

    await addAuditLog({
      inventory_session_id: sessionId,
      action: 'bulk_scan',
      new_value: String(codes.length),
      metadata: {
        unknown_codes: unknownCodes,
        matched_codes: Array.from(counts.keys()).filter((code) => !unknownCodes.includes(code)),
        previous_items: Array.from(originals.values()).length,
      },
    });

    await refreshAll();
    return { unknownCodes };
  };

  const applySession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.rpc('apply_inventory_session' as any, {
        _session_id: sessionId,
      });
      if (error) throw error;
      await refreshAll();
      toast({ title: 'Inventaire validé', description: 'Les stocks Fixway ont été mis à jour.' });
      return data as Array<{ updated_rows: number; missing_rows: number; blocked_reserved_rows: number }>;
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const deleteSession = async (sessionId: string) => {
    const { error } = await supabase.from('inventory_sessions' as any).delete().eq('id', sessionId);
    if (error) throw error;
    if (selectedSessionId === sessionId) setSelectedSessionId(null);
    await refreshAll();
  };

  const stats = useMemo(() => {
    const session = sessionQuery.data;
    const items = itemsQuery.data || [];
    const remainingItems = Math.max((session?.total_items || 0) - (session?.counted_items || 0), 0);
    const notFoundItems = items.filter((item) => item.line_status === 'missing').length;
    const overwrittenItems = items.filter((item) => item.applied_previous_quantity !== null || item.applied_new_quantity !== null).length;
    const reservedConflicts = items.filter(
      (item) => (item.counted_quantity ?? 0) < ((item as any).reserved_quantity ?? 0),
    ).length;

    return {
      remainingItems,
      notFoundItems,
      overwrittenItems,
      reservedConflicts,
    };
  }, [itemsQuery.data, sessionQuery.data]);

  return {
    shopId,
    selectedSessionId: sessionId,
    setSelectedSessionId,
    sessions: sessionsQuery.data || [],
    currentSession: sessionQuery.data,
    items: itemsQuery.data || [],
    logs: logsQuery.data || [],
    loading: sessionsQuery.isLoading || sessionQuery.isLoading || itemsQuery.isLoading,
    createSession,
    updateSession,
    updateItem,
    bulkScanCodes,
    applySession,
    deleteSession,
    refreshAll,
    stats,
  };
}
