export type InventoryMode = 'assisted' | 'scan' | 'manual';
export type InventoryStatus = 'draft' | 'in_progress' | 'paused' | 'completed' | 'applied' | 'cancelled';
export type InventoryLineStatus = 'pending' | 'found' | 'missing' | 'adjusted' | 'skipped' | 'applied';

export interface InventorySession {
  id: string;
  shop_id: string;
  created_by_profile_id: string | null;
  created_by_name: string | null;
  name: string;
  mode: InventoryMode;
  status: InventoryStatus;
  notes: string | null;
  forced_stop: boolean;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  applied_at: string | null;
  total_items: number;
  counted_items: number;
  found_items: number;
  missing_items: number;
  expected_total_cost: number;
  counted_total_cost: number;
  missing_total_cost: number;
  variance_total_cost: number;
  created_at: string;
  updated_at: string;
}

export interface InventorySessionItem {
  id: string;
  inventory_session_id: string;
  shop_id: string;
  part_id: string | null;
  position: number;
  part_name: string;
  part_reference: string | null;
  part_sku: string | null;
  part_supplier: string | null;
  unit_cost: number;
  expected_quantity: number;
  counted_quantity: number | null;
  variance_quantity: number;
  variance_value: number;
  line_status: InventoryLineStatus;
  entry_method: InventoryMode | null;
  is_missing: boolean;
  last_scanned_code: string | null;
  scan_count: number;
  counted_at: string | null;
  applied_previous_quantity: number | null;
  applied_new_quantity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryAuditLog {
  id: string;
  shop_id: string;
  inventory_session_id: string;
  inventory_session_item_id: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  changed_by_profile_id: string | null;
  changed_by_name: string;
  created_at: string;
}

export const INVENTORY_MODE_LABELS: Record<InventoryMode, string> = {
  assisted: 'Assisté',
  scan: 'Scan / QR / SKU',
  manual: 'Saisie manuelle',
};

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  paused: 'En pause',
  completed: 'Terminé',
  applied: 'Appliqué',
  cancelled: 'Annulé',
};

export const INVENTORY_LINE_STATUS_LABELS: Record<InventoryLineStatus, string> = {
  pending: 'À traiter',
  found: 'Trouvé',
  missing: 'Non trouvé',
  adjusted: 'Ajusté',
  skipped: 'Ignoré',
  applied: 'Appliqué',
};
