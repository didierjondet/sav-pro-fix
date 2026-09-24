/**
 * Règle UNIQUE de calcul financier SAV (CA / coûts / marge) utilisée partout
 * dans le logiciel : tableau de bord, statistiques, rapports, détails CA/dépenses,
 * comparaisons mensuelles.
 *
 * - SAV comptés : statut marqué « inclus dans les statistiques » (include_in_metrics)
 *   et type non exclu des statistiques (exclude_from_stats).
 * - Le type de SAV décide : CA compté ou non (exclude_sales_revenue),
 *   coûts comptés ou non (exclude_purchase_costs). Types archivés inclus.
 * - CA = prix de vente HT des pièces (prix figé du SAV, repli catalogue),
 *   moins la prise en charge (totale = 0, partielle = montant déduit).
 * - Coût = prix d'achat HT figé dans le SAV (repli catalogue).
 * - Marge = CA HT − coût HT.
 * - Devis acceptés : ajoutés au CA uniquement s'ils ne sont pas devenus un SAV.
 * - La période est toujours fournie par l'appelant (filtre de l'écran / widget).
 */
import { supabase } from '@/integrations/supabase/client';
import { splitTtcHt } from '@/lib/vatCalculator';
import { DEFAULT_BILLING_CONFIG, type BillingConfig } from '@/hooks/useBillingConfig';

export interface FinanceTypeRule {
  type_key: string;
  exclude_from_stats?: boolean | null;
  exclude_purchase_costs?: boolean | null;
  exclude_sales_revenue?: boolean | null;
}

export interface FinanceStatusRule {
  status_key: string;
  include_in_metrics?: boolean | null;
}

export interface FinancePart {
  quantity?: number | null;
  unit_price?: number | null;
  purchase_price?: number | null;
  part?: { selling_price?: number | null; purchase_price?: number | null } | null;
  parts?: { selling_price?: number | null; purchase_price?: number | null } | null;
}

export interface FinanceCase {
  sav_type: string;
  status: string;
  taken_over?: boolean | null;
  partial_takeover?: boolean | null;
  takeover_amount?: number | null;
  sav_parts?: FinancePart[] | null;
}

export interface CaseFinance {
  counted: boolean;          // entre dans les totaux (statut + type)
  rawRevenueTTC: number;     // avant prise en charge / exclusion
  revenueTTC: number;
  revenueHT: number;
  vat: number;
  cost: number;              // HT
  margin: number;            // HT
  revenueRatio: number;      // part TTC effectivement facturée
  takeoverTTC: number;       // montant pris en charge par le magasin
  revenueExcluded: boolean;
  costExcluded: boolean;
}

export interface FinanceContext {
  types: FinanceTypeRule[];
  metricsStatusKeys: string[];
  billing: BillingConfig;
}

const FALLBACK_METRICS = ['ready', 'pret_et_cloture'];

export function getMetricsStatusKeys(statuses: FinanceStatusRule[] | null | undefined): string[] {
  const keys = (statuses || []).filter(s => s.include_in_metrics).map(s => s.status_key);
  return keys.length > 0 ? keys : FALLBACK_METRICS;
}

export function getTypeRule(types: FinanceTypeRule[], typeKey: string): FinanceTypeRule {
  return types.find(t => t.type_key === typeKey) || { type_key: typeKey };
}

export function isCaseCounted(c: Pick<FinanceCase, 'status' | 'sav_type'>, ctx: FinanceContext): boolean {
  if (!ctx.metricsStatusKeys.includes(c.status)) return false;
  return !getTypeRule(ctx.types, c.sav_type).exclude_from_stats;
}

export function computeCaseFinance(c: FinanceCase, ctx: FinanceContext): CaseFinance {
  const rule = getTypeRule(ctx.types, c.sav_type);
  const parts = c.sav_parts || [];
  const revenueExcluded = !!(rule.exclude_sales_revenue || rule.exclude_from_stats);
  const costExcluded = !!(rule.exclude_purchase_costs || rule.exclude_from_stats);

  let rawTTC = 0;
  let rawHT = 0;
  let rawCost = 0;
  for (const p of parts) {
    const qty = Number(p.quantity ?? 1) || 0;
    const catalog = p.part || p.parts || null;
    const unit = Number(p.unit_price ?? catalog?.selling_price ?? 0) || 0;
    const purchase = Number(p.purchase_price ?? catalog?.purchase_price ?? 0) || 0;
    const split = splitTtcHt(unit, ctx.billing);
    rawTTC += split.ttc * qty;
    rawHT += split.ht * qty;
    rawCost += purchase * qty;
  }

  let billedTTC = rawTTC;
  if (c.taken_over && !c.partial_takeover) billedTTC = 0;
  else if (c.partial_takeover && c.takeover_amount) {
    billedTTC = Math.max(0, rawTTC - (Number(c.takeover_amount) || 0));
  }
  const takeoverTTC = rawTTC - billedTTC;
  const ratio = rawTTC > 0 ? billedTTC / rawTTC : 0;

  const revenueTTC = revenueExcluded ? 0 : billedTTC;
  const revenueHT = revenueExcluded ? 0 : rawHT * ratio;
  const cost = costExcluded ? 0 : rawCost;

  return {
    counted: isCaseCounted(c, ctx),
    rawRevenueTTC: rawTTC,
    revenueTTC,
    revenueHT,
    vat: Math.max(0, revenueTTC - revenueHT),
    cost,
    margin: revenueHT - cost,
    revenueRatio: revenueExcluded ? 0 : ratio,
    takeoverTTC: revenueExcluded ? 0 : takeoverTTC,
    revenueExcluded,
    costExcluded,
  };
}

export interface FinanceQuote {
  total_amount?: number | null;
  status?: string | null;
  sav_case_id?: string | null;
}

/** Devis comptés : acceptés et non transformés en SAV. */
export function isQuoteCounted(q: FinanceQuote): boolean {
  return q.status === 'accepted' && !q.sav_case_id;
}

export function computeQuoteRevenue(q: FinanceQuote, billing: BillingConfig) {
  if (!isQuoteCounted(q)) return { revenueHT: 0, revenueTTC: 0 };
  const s = splitTtcHt(Number(q.total_amount) || 0, billing);
  return { revenueHT: s.ht, revenueTTC: s.ttc };
}

/** Charge types (actifs + archivés), statuts et configuration TVA d'un magasin. */
export async function fetchFinanceContext(shopId: string): Promise<FinanceContext> {
  const [typesRes, statusesRes, billingRes] = await Promise.all([
    supabase
      .from('shop_sav_types')
      .select('type_key, exclude_from_stats, exclude_purchase_costs, exclude_sales_revenue')
      .eq('shop_id', shopId),
    supabase
      .from('shop_sav_statuses')
      .select('status_key, include_in_metrics')
      .eq('shop_id', shopId)
      .eq('is_active', true),
    supabase.from('shop_billing_config' as any).select('*').eq('shop_id', shopId).maybeSingle(),
  ]);
  return {
    types: (typesRes.data || []) as FinanceTypeRule[],
    metricsStatusKeys: getMetricsStatusKeys(statusesRes.data as FinanceStatusRule[]),
    billing: ((billingRes.data as any) || { shop_id: shopId, ...DEFAULT_BILLING_CONFIG }) as BillingConfig,
  };
}

/** Sélection sav_parts commune pour les calculs financiers. */
export const FINANCE_PARTS_SELECT =
  'sav_parts(quantity, unit_price, purchase_price, custom_part_name, part:parts(name, selling_price, purchase_price))';

/** Devis acceptés non transformés en SAV sur une période. */
export async function fetchCountedQuotes(shopId: string, start: Date, end: Date) {
  const { data, error } = await supabase
    .from('quotes')
    .select('total_amount, status, sav_case_id, created_at')
    .eq('shop_id', shopId)
    .eq('status', 'accepted')
    .is('sav_case_id', null)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  if (error) throw error;
  return data || [];
}
