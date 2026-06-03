import { useMemo } from 'react';
import { useBillingConfig } from '@/hooks/useBillingConfig';
import { useParts } from '@/hooks/useParts';
import { computeLineTotals, regimeLabel } from '@/lib/vatCalculator';

export interface BillingLineInput {
  part_id?: string | null;
  /** Unit price TTC (or HT depending on shop config) as currently saved in the line */
  unit_public_price: number;
  unit_purchase_price?: number;
  quantity: number;
  /** Optional explicit override for time in minutes (custom item) */
  time_minutes?: number | null;
  /** Optional explicit labor cost override */
  labor_cost?: number | null;
}

interface Props {
  lines: BillingLineInput[];
  /** Optional discount applied on the parts subtotal (TTC) */
  discountTotal?: number;
}

/**
 * Compact, read-only billing summary that shows VAT breakdown + automatic labor line
 * according to the shop billing config. Can be used in quotes, SAVs, previews, etc.
 */
export function BillingTotalsSummary({ lines, discountTotal = 0 }: Props) {
  const { config } = useBillingConfig();
  const { parts } = useParts();

  const totals = useMemo(() => {
    let partsHT = 0, partsTTC = 0, laborHT = 0, vatParts = 0, vatLabor = 0;
    for (const l of lines) {
      const p = l.part_id ? parts.find(pp => pp.id === l.part_id) : undefined;
      const partLike = {
        selling_price: l.unit_public_price,
        purchase_price: l.unit_purchase_price ?? p?.purchase_price ?? 0,
        time_minutes: l.time_minutes ?? p?.time_minutes ?? null,
        labor_cost: l.labor_cost ?? (p as any)?.labor_cost ?? null,
      };
      const t = computeLineTotals(partLike, l.quantity || 0, config, l.time_minutes ?? undefined);
      partsHT += t.partTotalHT;
      partsTTC += t.partTotalTTC;
      laborHT += t.laborTotalHT;
      vatParts += t.vatPartsAmount;
      vatLabor += t.vatLaborAmount;
    }
    const partsAfterDiscount = Math.max(0, partsTTC - (discountTotal || 0));
    const totalHT = partsHT + laborHT - (discountTotal || 0);
    const totalTTC = partsAfterDiscount + laborHT + vatLabor;
    return {
      partsHT: r(partsHT), partsTTC: r(partsTTC),
      laborHT: r(laborHT),
      vatParts: r(vatParts), vatLabor: r(vatLabor),
      totalHT: r(Math.max(0, totalHT)),
      totalTTC: r(Math.max(0, totalTTC)),
    };
  }, [lines, parts, config, discountTotal]);

  const showVatDetail = config.vat_regime === 'standard';
  const showLabor = config.labor_billing_enabled && totals.laborHT > 0;
  const isMargin = config.vat_regime === 'margin';
  const isNone = config.vat_regime === 'none';

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Régime: {regimeLabel(config.vat_regime)}</span>
      </div>

      {showLabor && (
        <div className="flex justify-between">
          <span>{config.labor_label} (HT)</span>
          <span>{totals.laborHT.toFixed(2)} €</span>
        </div>
      )}

      {showVatDetail && (
        <>
          <div className="flex justify-between">
            <span>Total HT</span>
            <span>{totals.totalHT.toFixed(2)} €</span>
          </div>
          {totals.vatParts > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>TVA pièces ({config.vat_rate_parts}%)</span>
              <span>{totals.vatParts.toFixed(2)} €</span>
            </div>
          )}
          {totals.vatLabor > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>TVA main d'œuvre ({config.vat_rate_labor}%)</span>
              <span>{totals.vatLabor.toFixed(2)} €</span>
            </div>
          )}
        </>
      )}

      <div className="flex justify-between border-t pt-1.5 font-semibold">
        <span>{showVatDetail ? 'Total TTC' : 'Total'}</span>
        <span>{totals.totalTTC.toFixed(2)} €</span>
      </div>

      {isNone && (
        <p className="text-[11px] text-muted-foreground italic">
          TVA non applicable, art. 293 B du CGI.
        </p>
      )}
      {isMargin && (
        <p className="text-[11px] text-muted-foreground italic">
          TVA sur marge — art. 297 A du CGI (non détaillée).
        </p>
      )}
    </div>
  );
}

function r(n: number) { return Math.round(n * 100) / 100; }
