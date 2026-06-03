import { supabase } from '@/integrations/supabase/client';
import { computeLineTotals, regimeLabel, type PartLikeForCalc } from '@/lib/vatCalculator';
import { DEFAULT_BILLING_CONFIG, type BillingConfig } from '@/hooks/useBillingConfig';

export async function fetchBillingConfig(shopId?: string | null): Promise<BillingConfig> {
  if (!shopId) return { shop_id: '', ...DEFAULT_BILLING_CONFIG };
  try {
    const { data } = await supabase
      .from('shop_billing_config' as any)
      .select('*')
      .eq('shop_id', shopId)
      .maybeSingle();
    if (data) return data as any as BillingConfig;
  } catch (e) {
    console.warn('billing config fetch failed', e);
  }
  return { shop_id: shopId, ...DEFAULT_BILLING_CONFIG };
}

export interface VatLineInput {
  part: PartLikeForCalc;
  quantity: number;
  overrideMinutes?: number;
}

export interface VatTotals {
  partsHT: number;
  partsTTC: number;
  laborHT: number;
  laborTTC: number;
  vatParts: number;
  vatLabor: number;
  totalHT: number;
  totalTTC: number;
}

export function aggregateTotals(lines: VatLineInput[], config: BillingConfig): VatTotals {
  const init: VatTotals = {
    partsHT: 0, partsTTC: 0, laborHT: 0, laborTTC: 0,
    vatParts: 0, vatLabor: 0, totalHT: 0, totalTTC: 0,
  };
  return lines.reduce((acc, l) => {
    const t = computeLineTotals(l.part, l.quantity || 0, config, l.overrideMinutes);
    acc.partsHT += t.partTotalHT;
    acc.partsTTC += t.partTotalTTC;
    acc.laborHT += t.laborTotalHT;
    acc.laborTTC += t.laborTotalTTC;
    acc.vatParts += t.vatPartsAmount;
    acc.vatLabor += t.vatLaborAmount;
    acc.totalHT += t.totalHT;
    acc.totalTTC += t.totalTTC;
    return acc;
  }, init);
}

/** Returns an HTML block (table-like) for VAT breakdown, suited for PDFs. */
export function buildVatHtmlBlock(totals: VatTotals, config: BillingConfig): string {
  if (config.vat_regime === 'none') {
    return `
      <div style="margin-top:10px; padding:10px 12px; background:#f5f5f5; border-radius:5px; font-size:12px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Total pièces</span><span><strong>${totals.partsHT.toFixed(2)} €</strong></span>
        </div>
        ${totals.laborHT > 0 ? `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Main d'œuvre</span><span><strong>${totals.laborHT.toFixed(2)} €</strong></span>
        </div>` : ''}
        <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; border-top:1px solid #ccc; padding-top:6px; margin-top:6px;">
          <span>TOTAL</span><span>${totals.totalHT.toFixed(2)} €</span>
        </div>
        <p style="margin:8px 0 0; font-size:10px; color:#666; font-style:italic;">
          TVA non applicable, art. 293 B du CGI.
        </p>
      </div>
    `;
  }
  if (config.vat_regime === 'margin') {
    return `
      <div style="margin-top:10px; padding:10px 12px; background:#f5f5f5; border-radius:5px; font-size:12px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Total pièces</span><span><strong>${totals.partsTTC.toFixed(2)} €</strong></span>
        </div>
        ${totals.laborHT > 0 ? `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Main d'œuvre</span><span><strong>${totals.laborTTC.toFixed(2)} €</strong></span>
        </div>` : ''}
        <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; border-top:1px solid #ccc; padding-top:6px; margin-top:6px;">
          <span>TOTAL</span><span>${totals.totalTTC.toFixed(2)} €</span>
        </div>
        <p style="margin:8px 0 0; font-size:10px; color:#666; font-style:italic;">
          TVA sur marge — art. 297 A du CGI (non détaillée).
        </p>
      </div>
    `;
  }
  const totalVat = totals.vatParts + totals.vatLabor;
  return `
    <div style="margin-top:10px; padding:10px 12px; background:#f5f5f5; border-radius:5px; font-size:12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>Pièces HT</span><span>${totals.partsHT.toFixed(2)} €</span>
      </div>
      ${totals.laborHT > 0 ? `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>Main d'œuvre HT</span><span>${totals.laborHT.toFixed(2)} €</span>
      </div>` : ''}
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; border-top:1px dashed #ccc; padding-top:4px;">
        <span><strong>Total HT</strong></span><span><strong>${totals.totalHT.toFixed(2)} €</strong></span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>TVA pièces (${config.vat_rate_parts}%)</span><span>${totals.vatParts.toFixed(2)} €</span>
      </div>
      ${totals.vatLabor > 0 ? `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>TVA MO (${config.vat_rate_labor}%)</span><span>${totals.vatLabor.toFixed(2)} €</span>
        </div>` : ''}
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>Total TVA</span><span>${totalVat.toFixed(2)} €</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; border-top:1px solid #888; padding-top:6px; margin-top:6px;">
        <span>TOTAL TTC</span><span>${totals.totalTTC.toFixed(2)} €</span>
      </div>
      <p style="margin:8px 0 0; font-size:10px; color:#666; font-style:italic;">
        Régime: ${regimeLabel(config.vat_regime)}.
      </p>
    </div>
  `;
}
