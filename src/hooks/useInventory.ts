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
import { getInventoryDerivedData } from '@/hooks/inventory/derived';

const EMPTY_ITEMS: InventorySessionItem[] = [];

const inventoryRpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  params?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const inventoryAuditTable = supabase.from('inventory_audit_logs') as unknown as {
  insert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
};

const inventoryItemsTable = supabase.from('inventory_session_items') as unknown as {
  update: (values: Record<string, unknown>) => {
    eq: (column: string, value: string) => { eq: (column: string, value: string) => Promise<{ error: { message: string } | null }> };
  };
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

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

interface InventoryScanSummary {
  totalCodes: number;
  unknownCodes: string[];
  ambiguousCodes: string[];
  matchedCodes: string[];
  processedAt: string;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function buildNextPayload(input: UpdateInventoryItemInput) {
  const nextPayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.countedQuantity !== undefined) {
    nextPayload.counted_quantity = input.countedQuantity;
    nextPayload.counted_at = input.countedQuantity === null ? null : new Date().toISOString();
  }

  if (input.lineStatus) {
    nextPayload.line_status = input.lineStatus;
    nextPayload.is_missing = input.lineStatus === 'missing';
  }

  if (input.entryMethod) nextPayload.entry_method = input.entryMethod;
  if (input.lastScannedCode !== undefined) nextPayload.last_scanned_code = input.lastScannedCode;
  if (input.scanCount !== undefined) nextPayload.scan_count = input.scanCount;
  if (input.notes !== undefined) nextPayload.notes = input.notes;

  return nextPayload;
}

export function useInventory() {
  const { shop } = useShop();
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [lastScanBatch, setLastScanBatch] = useState<InventoryScanSummary | null>(null);

  const shopId = shop?.id;

  const sessionsQuery = useQuery({
    queryKey: ['inventory-sessions', shopId],
    enabled: !!shopId,
    queryFn: async (): Promise<InventorySession[]> => {
      const { data, error } = await supabase
        .from('inventory_sessions')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ? (JSON.parse(JSON.stringify(data)) as InventorySession[]) : [];
    },
  });

  const sessionId = selectedSessionId ?? sessionsQuery.data?.[0]?.id ?? null;

  const sessionQuery = useQuery({
    queryKey: ['inventory-session', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<InventorySession | null> => {
      const { data, error } = await supabase
        .from('inventory_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (error) throw error;
      return data ? (JSON.parse(JSON.stringify(data)) as InventorySession) : null;
    },
  });

  const itemsQuery = useQuery({
    queryKey: ['inventory-items', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<InventorySessionItem[]> => {
      const { data, error } = await supabase
        .from('inventory_session_items')
        .select('*')
        .eq('inventory_session_id', sessionId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data ? (JSON.parse(JSON.stringify(data)) as InventorySessionItem[]) : [];
    },
  });

  const logsQuery = useQuery({
    queryKey: ['inventory-logs', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<InventoryAuditLog[]> => {
      const { data, error } = await supabase
        .from('inventory_audit_logs')
        .select('*')
        .eq('inventory_session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data ? (JSON.parse(JSON.stringify(data)) as InventoryAuditLog[]) : [];
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

    await inventoryAuditTable.insert({
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
      const { data, error } = await inventoryRpc('begin_inventory_session', {
        _name: name,
        _mode: mode,
        _notes: notes || null,
      });

      if (error) throw error;
      setSelectedSessionId(data as string);
      await refreshAll();
      toast({ title: 'Inventaire lancé', description: 'La session a été créée avec son instantané de stock.' });
      return data as string;
    } catch (error: unknown) {
      toast({ title: 'Erreur', description: getErrorMessage(error), variant: 'destructive' });
      throw error;
    }
  };

  const updateSession = async (
    id: string,
    patch: Partial<InventorySession>,
    action?: string,
    metadata?: Record<string, unknown>,
  ) => {
    const previous = sessionQuery.data;
    const { error } = await supabase.from('inventory_sessions').update(patch).eq('id', id);
    if (error) throw error;

    if (action) {
      await addAuditLog({
        inventory_session_id: id,
        action,
        field_name: 'status',
        old_value: previous?.status ?? null,
        new_value: typeof patch.status === 'string' ? patch.status : null,
        metadata: metadata || {},
      });
    }

    await refreshAll();
  };

  const updateItem = async ({ sessionId: targetSessionId, itemId, ...input }: UpdateInventoryItemInput) => {
    const item = itemsQuery.data?.find((entry) => entry.id === itemId);
    const nextPayload = buildNextPayload({ sessionId: targetSessionId, itemId, ...input });

    const { error } = await inventoryItemsTable
      .update(nextPayload)
      .eq('id', itemId)
      .eq('inventory_session_id', targetSessionId);

    if (error) throw error;

    await addAuditLog({
      inventory_session_id: targetSessionId,
      inventory_session_item_id: itemId,
      action: 'item_updated',
      field_name: 'inventory_line',
      old_value: JSON.stringify({
        counted_quantity: item?.counted_quantity ?? null,
        line_status: item?.line_status ?? null,
        notes: item?.notes ?? null,
      }),
      new_value: JSON.stringify({
        counted_quantity: input.countedQuantity ?? item?.counted_quantity ?? null,
        line_status: input.lineStatus ?? item?.line_status ?? null,
        notes: input.notes ?? item?.notes ?? null,
      }),
      metadata: {
        item_name: item?.part_name,
        entry_method: input.entryMethod ?? item?.entry_method,
      },
    });

    await refreshAll();
  };

  const markItemMissing = async (targetSessionId: string, itemId: string, entryMethod: InventoryMode = 'manual') => {
    await updateItem({
      sessionId: targetSessionId,
      itemId,
      countedQuantity: 0,
      lineStatus: 'missing',
      entryMethod,
    });
  };

  const resetItem = async (targetSessionId: string, itemId: string) => {
    await updateItem({
      sessionId: targetSessionId,
      itemId,
      countedQuantity: null,
      lineStatus: 'pending',
      lastScannedCode: null,
      scanCount: 0,
      notes: null,
    });
  };

  const skipItem = async (targetSessionId: string, itemId: string) => {
    await updateItem({
      sessionId: targetSessionId,
      itemId,
      lineStatus: 'pending',
    });
  };

  const updateItemNote = async (targetSessionId: string, itemId: string, notes: string | null) => {
    await updateItem({ sessionId: targetSessionId, itemId, notes });
  };

  const pauseSession = async (targetSessionId: string) => {
    await updateSession(targetSessionId, { status: 'paused', paused_at: new Date().toISOString() }, 'session_paused');
  };

  const resumeSession = async (targetSessionId: string) => {
    await updateSession(targetSessionId, { status: 'in_progress', paused_at: null }, 'session_resumed');
  };

  const stopSession = async (targetSessionId: string) => {
    await updateSession(
      targetSessionId,
      { status: 'completed', forced_stop: true, completed_at: new Date().toISOString(), paused_at: null },
      'session_stopped',
    );
  };

  const cancelSession = async (targetSessionId: string) => {
    await updateSession(targetSessionId, { status: 'cancelled', paused_at: null }, 'session_cancelled');
  };

  const closeSession = async (targetSessionId: string) => {
    const derived = getInventoryDerivedData(sessionQuery.data, itemsQuery.data || []);
    if (derived.pendingItems.length > 0) {
      throw new Error('Toutes les lignes doivent être traitées avant de clôturer le comptage.');
    }

    await updateSession(
      targetSessionId,
      { status: 'completed', completed_at: new Date().toISOString(), paused_at: null, forced_stop: false },
      'session_completed',
    );
  };

  const bulkScanCodes = async (targetSessionId: string, codes: string[]) => {
    const items = itemsQuery.data || [];
    const counts = new Map<string, number>();

    codes
      .map(normalizeCode)
      .filter(Boolean)
      .forEach((code) => counts.set(code, (counts.get(code) || 0) + 1));

    const unknownCodes: string[] = [];
    const ambiguousCodes: string[] = [];
    const matchedCodes: string[] = [];

    const updates: Array<Promise<void>> = [];

    for (const [code, increment] of counts.entries()) {
      const matches = items
        .filter((item) => normalizeCode(item.part_sku || '') === code)
        .sort((a, b) => {
          const aPendingScore = a.line_status === 'pending' ? -1 : 1;
          const bPendingScore = b.line_status === 'pending' ? -1 : 1;
          return aPendingScore - bPendingScore || a.position - b.position;
        });

      if (!matches.length) {
        unknownCodes.push(code);
        continue;
      }

      if (matches.length > 1) {
        ambiguousCodes.push(code);
      }

      const match = matches[0];
      matchedCodes.push(code);
      const nextQuantity = (match.counted_quantity ?? 0) + increment;

      updates.push(
        updateItem({
          sessionId: targetSessionId,
          itemId: match.id,
          countedQuantity: nextQuantity,
          lineStatus: nextQuantity === match.expected_quantity ? 'found' : 'adjusted',
          entryMethod: 'scan',
          lastScannedCode: code,
          scanCount: (match.scan_count || 0) + increment,
        }),
      );
    }

    await Promise.all(updates);

    const summary = {
      totalCodes: codes.length,
      unknownCodes,
      ambiguousCodes,
      matchedCodes,
      processedAt: new Date().toISOString(),
    } satisfies InventoryScanSummary;

    setLastScanBatch(summary);

    await addAuditLog({
      inventory_session_id: targetSessionId,
      action: 'bulk_scan',
      new_value: String(codes.length),
      metadata: summary,
    });

    await refreshAll();
    return summary;
  };

  const applySession = async (targetSessionId: string) => {
    try {
      const derived = getInventoryDerivedData(sessionQuery.data, itemsQuery.data || []);
      if (derived.pendingItems.length > 0) {
        throw new Error('Impossible de valider tant que des lignes sont encore à traiter.');
      }

      const { data, error } = await inventoryRpc('apply_inventory_session', {
        _session_id: targetSessionId,
      });
      if (error) throw error;

      await addAuditLog({
        inventory_session_id: targetSessionId,
        action: 'session_applied',
        metadata: { updated_rows: data },
      });

      await refreshAll();
      toast({ title: 'Inventaire validé', description: 'Les stocks Fixway ont été mis à jour.' });
      return data as Array<{ updated_rows: number; missing_rows: number; blocked_reserved_rows: number }>;
    } catch (error: unknown) {
      toast({ title: 'Erreur', description: getErrorMessage(error), variant: 'destructive' });
      throw error;
    }
  };

  const deleteSession = async (targetSessionId: string) => {
    const { error } = await supabase.from('inventory_sessions').delete().eq('id', targetSessionId);
    if (error) throw error;
    if (selectedSessionId === targetSessionId) setSelectedSessionId(null);
    await refreshAll();
  };

  const currentSession = sessionQuery.data;
  const items = itemsQuery.data ?? EMPTY_ITEMS;
  const derived = useMemo(() => getInventoryDerivedData(currentSession, items), [currentSession, items]);

  const stats = useMemo(() => {
    const reservedConflicts = items.filter(
      (item) => (item.counted_quantity ?? 0) < (((item as InventorySessionItem & { reserved_quantity?: number | null }).reserved_quantity) ?? 0),
    ).length;

    return {
      remainingItems: derived.pendingItems.length,
      notFoundItems: derived.missingItems.length,
      overwrittenItems: derived.overwrittenItems.length,
      reservedConflicts,
      pendingItems: derived.pendingItems.length,
      exactMatchItems: derived.exactMatchItems.length,
      adjustedItems: derived.adjustedItems.length,
      overstockItems: derived.overstockItems.length,
      understockItems: derived.understockItems.length,
      completionRate: derived.completionRate,
    };
  }, [derived, items]);

  return {
    shopId,
    selectedSessionId: sessionId,
    setSelectedSessionId,
    sessions: sessionsQuery.data || [],
    currentSession,
    items,
    logs: logsQuery.data || [],
    loading: sessionsQuery.isLoading || sessionQuery.isLoading || itemsQuery.isLoading,
    createSession,
    updateSession,
    updateItem,
    markItemMissing,
    resetItem,
    skipItem,
    updateItemNote,
    pauseSession,
    resumeSession,
    stopSession,
    cancelSession,
    closeSession,
    bulkScanCodes,
    lastScanBatch,
    applySession,
    deleteSession,
    refreshAll,
    stats,
    pendingItems: derived.pendingItems,
    missingItems: derived.missingItems,
    adjustedItems: derived.adjustedItems,
    exactMatchItems: derived.exactMatchItems,
    overstockItems: derived.overstockItems,
    understockItems: derived.understockItems,
    overwrittenItems: derived.overwrittenItems,
    completionRate: derived.completionRate,
    canEditSession: derived.canEditSession,
    canCloseSession: derived.canCloseSession,
    canApplySession: derived.canApplySession,
    canDeleteSession: derived.canDeleteSession,
  };
}
