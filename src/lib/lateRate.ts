/**
 * Logique unifiée du taux de retard.
 * Règle: un SAV est "en retard" si sa date de clôture dépasse
 * (created_at + max_processing_days). Attribution = MOIS DE CLÔTURE.
 */
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format, subDays, subMonths, addDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

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

// ============================================================
// Helpers centralisés pour les widgets (KPI + graphique)
// ============================================================

export type LatePeriodKey = '7d' | '30d' | '1m_calendar' | '3m' | '6m' | '1y';

export interface ShopSavTypeCfg {
  type_key: string;
  max_processing_days?: number | null;
  exclude_from_stats?: boolean | null;
}

export interface ShopSavStatusCfg {
  status_key: string;
  is_final_status?: boolean | null;
}

export interface LateRateOptions {
  start: Date;
  end: Date;
  shopSavTypes?: ShopSavTypeCfg[] | null;
  shopSavStatuses?: ShopSavStatusCfg[] | null;
  savStatusesFilter?: string[] | null;
  savTypesFilter?: string[] | null;
}

/**
 * Filtre les SAV éligibles au calcul du taux de retard pour la période donnée.
 * Applique dans l'ordre: statut final, filtres widget, exclusions, max_days > 0,
 * puis attribution par date de clôture comprise dans [start, end].
 */
export function filterClosedForLateRate(cases: any[], opts: LateRateOptions): any[] {
  const { start, end, shopSavTypes, shopSavStatuses, savStatusesFilter, savTypesFilter } = opts;

  const excludedTypes = (shopSavTypes || [])
    .filter((t) => t.exclude_from_stats)
    .map((t) => t.type_key);

  const finalStatusKeys = (shopSavStatuses || [])
    .filter((s) => s.is_final_status)
    .map((s) => s.status_key);
  const effectiveFinalStatuses = finalStatusKeys.length > 0
    ? finalStatusKeys
    : ['ready', 'pret_et_cloture', 'cancelled', 'delivered'];

  return (cases || []).filter((c: any) => {
    if (!effectiveFinalStatuses.includes(c.status)) return false;
    if (excludedTypes.includes(c.sav_type)) return false;
    const maxDays = getMaxProcessingDays(c.sav_type, shopSavTypes);
    if (maxDays === 0) return false;

    if (savStatusesFilter && savStatusesFilter.length > 0 && !savStatusesFilter.includes(c.status)) return false;
    if (savTypesFilter && savTypesFilter.length > 0 && !savTypesFilter.includes(c.sav_type)) return false;

    const closureDate = getClosureDate(c);
    return closureDate >= start && closureDate <= end;
  });
}

export interface LateRateResult {
  lateCount: number;
  totalCount: number;
  lateRate: number;
}

export function computeLateRateForPeriod(cases: any[], opts: LateRateOptions): LateRateResult {
  const filtered = filterClosedForLateRate(cases, opts);
  let lateCount = 0;
  filtered.forEach((sav) => {
    const maxDays = getMaxProcessingDays(sav.sav_type, opts.shopSavTypes);
    if (isClosedLate(sav, maxDays)) lateCount++;
  });
  const totalCount = filtered.length;
  const lateRate = totalCount > 0 ? (lateCount / totalCount) * 100 : 0;
  return {
    lateCount,
    totalCount,
    lateRate: Math.round(lateRate * 10) / 10,
  };
}

// ============================================================
// Buckets pour le graphique d'évolution
// ============================================================

export interface LateRateBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
  lateCount: number;
  totalCount: number;
  lateRate: number;
}

/**
 * Construit la liste des intervalles [start, end] selon la temporalité.
 * - 1m_calendar: jours du mois en cours jusqu'à aujourd'hui
 * - 30d: 30 derniers jours, par jour
 * - 3m: 3 derniers mois (incl. mois courant), par mois
 * - 6m: 6 derniers mois, par mois
 * - 1y: 12 derniers mois, par mois
 * - 7d: 7 derniers jours, par jour
 */
export function buildLateRateBuckets(period: LatePeriodKey): Array<{ key: string; label: string; start: Date; end: Date }> {
  const now = new Date();
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];

  if (period === '1m_calendar') {
    const monthStart = startOfMonth(now);
    let d = monthStart;
    while (d <= now) {
      buckets.push({
        key: format(d, 'yyyy-MM-dd'),
        label: format(d, 'dd'),
        start: startOfDay(d),
        end: endOfDay(d),
      });
      d = addDays(d, 1);
    }
    return buckets;
  }

  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    const startBase = startOfDay(subDays(now, days - 1));
    for (let i = 0; i < days; i++) {
      const d = addDays(startBase, i);
      buckets.push({
        key: format(d, 'yyyy-MM-dd'),
        label: format(d, 'dd/MM'),
        start: startOfDay(d),
        end: endOfDay(d),
      });
    }
    return buckets;
  }

  // 3m / 6m / 1y => mois
  const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
  const firstMonth = startOfMonth(subMonths(now, months - 1));
  for (let i = 0; i < months; i++) {
    const mStart = addMonths(firstMonth, i);
    const mEnd = endOfMonth(mStart);
    buckets.push({
      key: format(mStart, 'yyyy-MM'),
      label: format(mStart, 'MMM', { locale: fr }),
      start: mStart,
      end: mEnd,
    });
  }
  return buckets;
}

export function computeLateRateBuckets(
  cases: any[],
  period: LatePeriodKey,
  opts: Omit<LateRateOptions, 'start' | 'end'>
): LateRateBucket[] {
  const buckets = buildLateRateBuckets(period);
  return buckets.map((b) => {
    const res = computeLateRateForPeriod(cases, { ...opts, start: b.start, end: b.end });
    return {
      ...b,
      lateCount: res.lateCount,
      totalCount: res.totalCount,
      lateRate: res.lateRate,
    };
  });
}

/**
 * Plage globale [start, end] pour une temporalité donnée.
 */
export function getRangeForPeriod(period: LatePeriodKey): { start: Date; end: Date } {
  const end = endOfDay(new Date());
  let start: Date;
  switch (period) {
    case '7d': start = startOfDay(subDays(end, 6)); break;
    case '30d': start = startOfDay(subDays(end, 29)); break;
    case '1m_calendar': start = startOfMonth(end); break;
    case '3m': start = startOfMonth(subMonths(end, 2)); break;
    case '6m': start = startOfMonth(subMonths(end, 5)); break;
    case '1y': start = startOfMonth(subMonths(end, 11)); break;
    default: start = startOfDay(subDays(end, 29));
  }
  return { start, end };
}
