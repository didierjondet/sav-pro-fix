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

/**
 * Split a price into HT/TTC/VAT parts using the shop billing config.
 * If regime is 'none' → no VAT (HT = TTC).
 * If prices_include_vat → the input is treated as TTC and HT is derived.
 * Otherwise → input is treated as HT and TTC is derived.
 */
export function splitTtcHt(unit: number, config: BillingConfig): { ht: number; ttc: number; vat: number; rate: number } {
  const price = Number(unit) || 0;
  if (config.vat_regime === 'none') {
    return { ht: round2(price), ttc: round2(price), vat: 0, rate: 0 };
  }
  const rate = (config.vat_rate_parts || 0) / 100;
  if (config.prices_include_vat) {
    const ht = rate > 0 ? price / (1 + rate) : price;
    return { ht: round2(ht), ttc: round2(price), vat: round2(price - ht), rate: config.vat_rate_parts || 0 };
  }
  const ttc = price * (1 + rate);
  return { ht: round2(price), ttc: round2(ttc), vat: round2(ttc - price), rate: config.vat_rate_parts || 0 };
}

