import type { InventorySession, InventorySessionItem } from '@/components/settings/inventory/types';

export interface InventoryDerivedData {
  pendingItems: InventorySessionItem[];
  missingItems: InventorySessionItem[];
  adjustedItems: InventorySessionItem[];
  exactMatchItems: InventorySessionItem[];
  overstockItems: InventorySessionItem[];
  understockItems: InventorySessionItem[];
  overwrittenItems: InventorySessionItem[];
  completionRate: number;
  hasPendingItems: boolean;
  canEditSession: boolean;
  canCloseSession: boolean;
  canApplySession: boolean;
  canDeleteSession: boolean;
}

const editableStatuses: InventorySession['status'][] = ['draft', 'in_progress', 'paused'];

export function getInventoryDerivedData(
  session: InventorySession | null | undefined,
  items: InventorySessionItem[],
): InventoryDerivedData {
  const pendingItems = items.filter((item) => item.line_status === 'pending');
  // Une ligne est considérée comme manquante uniquement si elle a été traitée
  // (line_status !== 'pending') et qu'elle est marquée manquante ou comptée à 0.
  const missingItems = items.filter(
    (item) =>
      item.line_status !== 'pending' &&
      (item.line_status === 'missing' || item.is_missing || (item.counted_quantity ?? 0) === 0),
  );
  const adjustedItems = items.filter(
    (item) => item.counted_quantity !== null && item.line_status !== 'pending' && item.variance_quantity !== 0,
  );
  const exactMatchItems = items.filter(
    (item) => item.counted_quantity !== null && item.line_status === 'found' && item.variance_quantity === 0,
  );
  const overstockItems = items.filter((item) => (item.counted_quantity ?? 0) > item.expected_quantity);
  const understockItems = items.filter(
    (item) => item.counted_quantity !== null && (item.counted_quantity ?? 0) < item.expected_quantity,
  );
  const overwrittenItems = items.filter(
    (item) => item.applied_previous_quantity !== null || item.applied_new_quantity !== null || item.variance_quantity !== 0,
  );

  const totalItems = session?.total_items ?? items.length;
  const completionRate = totalItems > 0 ? ((totalItems - pendingItems.length) / totalItems) * 100 : 0;
  const canEditSession = !!session && editableStatuses.includes(session.status);
  const canCloseSession = !!session && canEditSession && pendingItems.length === 0 && items.length > 0;
  const canApplySession = !!session && session.status === 'completed' && pendingItems.length === 0;
  const canDeleteSession = !!session && ['draft', 'cancelled'].includes(session.status);

  return {
    pendingItems,
    missingItems,
    adjustedItems,
    exactMatchItems,
    overstockItems,
    understockItems,
    overwrittenItems,
    completionRate,
    hasPendingItems: pendingItems.length > 0,
    canEditSession,
    canCloseSession,
    canApplySession,
    canDeleteSession,
  };
}
