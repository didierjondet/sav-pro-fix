export interface SavPartNeed {
  part_id: string;
  sav_case_id: string;
  quantity: number;
  physical_stock: number;
  case_created_at: string;
  is_final: boolean;
}

export interface UncoveredNeed<T extends SavPartNeed> {
  item: T;
  missing: number;
}

/**
 * Allocates each part's physical stock to open SAV cases, oldest first,
 * and returns the cases (with missing quantity) that the stock cannot cover.
 */
export function computeUncoveredSavNeeds<T extends SavPartNeed>(items: T[]): UncoveredNeed<T>[] {
  const open = items.filter(i => !i.is_final && (i.quantity || 0) > 0);
  const byPart = new Map<string, T[]>();
  for (const i of open) {
    const list = byPart.get(i.part_id) || [];
    list.push(i);
    byPart.set(i.part_id, list);
  }
  const result: UncoveredNeed<T>[] = [];
  for (const list of byPart.values()) {
    list.sort((a, b) => a.case_created_at.localeCompare(b.case_created_at));
    let remaining = Math.max(0, list[0].physical_stock || 0);
    for (const i of list) {
      const used = Math.min(remaining, i.quantity);
      remaining -= used;
      const missing = i.quantity - used;
      if (missing > 0) result.push({ item: i, missing });
    }
  }
  return result;
}
