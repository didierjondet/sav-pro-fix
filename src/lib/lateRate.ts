/**
 * Logique unifiée du taux de retard.
 * Règle: un SAV est "en retard" si sa date de clôture dépasse
 * (created_at + max_processing_days). Attribution = MOIS DE CLÔTURE.
 */

export function getClosureDate(sav: any): Date {
  const history = Array.isArray(sav?.closure_history) ? sav.closure_history : null;
  const last = history && history.length > 0 ? history[history.length - 1] : null;
  const closedAt = last?.closed_at || sav?.updated_at;
  return new Date(closedAt);
}

export function isClosedLate(sav: any, maxDays: number): boolean {
  if (!maxDays || maxDays <= 0) return false;
  const created = new Date(sav.created_at).getTime();
  const closed = getClosureDate(sav).getTime();
  const diffDays = (closed - created) / (1000 * 60 * 60 * 24);
  return diffDays > maxDays;
}

export function getMaxProcessingDays(
  savType: string,
  shopSavTypes?: Array<{ type_key: string; max_processing_days?: number | null }> | null
): number {
  const cfg = (shopSavTypes || []).find((t) => t.type_key === savType);
  if (cfg && typeof cfg.max_processing_days === 'number') return cfg.max_processing_days;
  if (savType === 'internal') return 0;
  if (savType === 'external') return 9;
  return 7;
}
