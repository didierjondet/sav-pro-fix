import type { BillingConfig } from '@/hooks/useBillingConfig';

export interface PartLikeForCalc {
  selling_price?: number | null;
  purchase_price?: number | null;
  time_minutes?: number | null;
  labor_cost?: number | null;
}

/**
 * Compute labor cost (HT) for a single unit of a part, based on shop billing config.
 * Returns 0 when labor billing is disabled.
 */
export function computeLaborCost(part: PartLikeForCalc, config: BillingConfig, overrideMinutes?: number): number {
  if (!config.labor_billing_enabled) return 0;
  if (config.labor_mode === 'flat') {
    return Number(part.labor_cost) || 0;
  }
  // hourly
  if (typeof part.labor_cost === 'number' && part.labor_cost > 0) return part.labor_cost; // override
  const minutes = typeof overrideMinutes === 'number' ? overrideMinutes : (part.time_minutes ?? 0);
  if (!minutes) return 0;
  return Math.round((minutes / 60) * (config.labor_hourly_rate || 0) * 100) / 100;
}

export interface LineTotals {
  partTotalHT: number;
  partTotalTTC: number;
  laborTotalHT: number;
  laborTotalTTC: number;
  vatPartsAmount: number;
  vatLaborAmount: number;
  totalHT: number;
  totalTTC: number;
}

/**
 * Compute totals for one line (qty units of a part).
 * Honors regime: 'none' (no VAT), 'standard' (VAT parts + VAT labor), 'margin' (VAT only on margin parts + VAT labor classique).
 */
export function computeLineTotals(
  part: PartLikeForCalc,
  qty: number,
  config: BillingConfig,
  overrideMinutes?: number
): LineTotals {
  const sellingTTCInput = Number(part.selling_price) || 0; // currently treated TTC by app
  const purchase = Number(part.purchase_price) || 0;
  const ratePart = (config.vat_rate_parts || 0) / 100;
  const rateLabor = (config.vat_rate_labor || 0) / 100;
  const laborUnitHT = computeLaborCost(part, config, overrideMinutes);

  // Resolve part HT/TTC unit prices
  let partUnitHT = sellingTTCInput;
  let partUnitTTC = sellingTTCInput;
  if (config.vat_regime === 'none') {
    partUnitHT = sellingTTCInput;
    partUnitTTC = sellingTTCInput;
  } else if (config.prices_include_vat) {
    partUnitHT = ratePart > 0 ? sellingTTCInput / (1 + ratePart) : sellingTTCInput;
    partUnitTTC = sellingTTCInput;
  } else {
    partUnitHT = sellingTTCInput;
    partUnitTTC = sellingTTCInput * (1 + ratePart);
  }

  const partTotalHT = partUnitHT * qty;
  const partTotalTTC = partUnitTTC * qty;
  const laborTotalHT = laborUnitHT * qty;

  let vatPartsAmount = 0;
  let vatLaborAmount = 0;

  if (config.vat_regime === 'standard') {
    vatPartsAmount = partTotalTTC - partTotalHT;
    vatLaborAmount = laborTotalHT * rateLabor;
  }

  const laborTotalTTC = laborTotalHT + vatLaborAmount;
  const totalHT = partTotalHT + laborTotalHT;
  const totalTTC = partTotalTTC + laborTotalTTC;

  return {
    partTotalHT: round2(partTotalHT),
    partTotalTTC: round2(partTotalTTC),
    laborTotalHT: round2(laborTotalHT),
    laborTotalTTC: round2(laborTotalTTC),
    vatPartsAmount: round2(vatPartsAmount),
    vatLaborAmount: round2(vatLaborAmount),
    totalHT: round2(totalHT),
    totalTTC: round2(totalTTC),
  };
}

export function regimeLabel(r: BillingConfig['vat_regime']): string {
  if (r === 'none') return 'Auto-entrepreneur (TVA non applicable, art. 293 B du CGI)';
  return 'TVA classique';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
