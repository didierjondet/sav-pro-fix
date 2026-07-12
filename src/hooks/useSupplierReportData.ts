import { useMemo } from 'react';
import type { ReportData } from './useReportData';

export interface SupplierReportRow {
  supplier_id: string | null;
  supplier_name: string;
  parts_count: number;
  sav_count: number;
  expenses: number;      // HT
  revenue: number;       // HT
  revenue_ttc: number;   // TTC
  vat_collected: number;
  margin: number;        // HT
  margin_pct: number;
}

export interface SupplierReportTotals {
  parts_count: number;
  sav_count: number;
  expenses: number;
  revenue: number;
  revenue_ttc: number;
  vat_collected: number;
  margin: number;
  margin_pct: number;
}

const UNKNOWN_KEY = '__none__';

export function useSupplierReportData(data: ReportData) {
  return useMemo(() => {
    const buckets = new Map<string, {
      supplier_id: string | null;
      supplier_name: string;
      parts_count: number;
      sav_ids: Set<string>;
      expenses: number;
      revenue: number;
      revenue_ttc: number;
      vat_collected: number;
    }>();

    for (const sav of data.items) {
      for (const part of sav.parts) {
        const key = part.supplier_id ?? UNKNOWN_KEY;
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = {
            supplier_id: part.supplier_id,
            supplier_name: part.supplier_name || 'Sans fournisseur',
            parts_count: 0,
            sav_ids: new Set(),
            expenses: 0,
            revenue: 0,
            revenue_ttc: 0,
            vat_collected: 0,
          };
          buckets.set(key, bucket);
        }
        bucket.parts_count += part.quantity || 0;
        bucket.sav_ids.add(sav.id);
        const expense = sav.purchase_cost_excluded
          ? 0
          : (part.purchase_price || 0) * (part.quantity || 0);
        const revenueHT = (part.unit_price_ht || 0) * (part.quantity || 0) * sav.revenue_ratio;
        const revenueTTC = (part.unit_price || 0) * (part.quantity || 0) * sav.revenue_ratio;
        bucket.expenses += expense;
        bucket.revenue += revenueHT;
        bucket.revenue_ttc += revenueTTC;
        bucket.vat_collected += Math.max(0, revenueTTC - revenueHT);
      }
    }

    const rows: SupplierReportRow[] = Array.from(buckets.values()).map(b => {
      const margin = b.revenue - b.expenses;
      return {
        supplier_id: b.supplier_id,
        supplier_name: b.supplier_name,
        parts_count: b.parts_count,
        sav_count: b.sav_ids.size,
        expenses: b.expenses,
        revenue: b.revenue,
        revenue_ttc: b.revenue_ttc,
        vat_collected: b.vat_collected,
        margin,
        margin_pct: b.revenue > 0 ? (margin / b.revenue) * 100 : 0,
      };
    });

    rows.sort((a, b) => b.margin - a.margin);

    const totals: SupplierReportTotals = rows.reduce((acc, r) => ({
      parts_count: acc.parts_count + r.parts_count,
      sav_count: acc.sav_count + r.sav_count,
      expenses: acc.expenses + r.expenses,
      revenue: acc.revenue + r.revenue,
      revenue_ttc: acc.revenue_ttc + r.revenue_ttc,
      vat_collected: acc.vat_collected + r.vat_collected,
      margin: acc.margin + r.margin,
      margin_pct: 0,
    }), { parts_count: 0, sav_count: 0, expenses: 0, revenue: 0, revenue_ttc: 0, vat_collected: 0, margin: 0, margin_pct: 0 });
    totals.margin_pct = totals.revenue > 0 ? (totals.margin / totals.revenue) * 100 : 0;

    return { rows, totals };
  }, [data]);
}
