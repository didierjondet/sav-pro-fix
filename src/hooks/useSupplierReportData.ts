import { useMemo } from 'react';
import type { ReportData } from './useReportData';

export interface SupplierDetailLine {
  sav_id: string;
  case_number: string;
  customer_name: string;
  part_name: string;
  quantity: number;
  purchase: number;   // HT total
  revenue: number;    // HT total
  margin: number;     // HT
}

export interface SupplierTypeGroup {
  sav_type: string;
  parts_count: number;
  sav_count: number;
  expenses: number;
  revenue: number;
  margin: number;
  lines: SupplierDetailLine[];
}

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
  types: SupplierTypeGroup[];
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

interface TypeBucket {
  parts_count: number;
  sav_ids: Set<string>;
  expenses: number;
  revenue: number;
  lines: SupplierDetailLine[];
}

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
      types: Map<string, TypeBucket>;
    }>();

    for (const sav of data.items) {
      // Mêmes règles que les totaux des Rapports
      if (sav.counted === false) continue;
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
            types: new Map(),
          };
          buckets.set(key, bucket);
        }
        const qty = part.quantity || 0;
        const expense = sav.purchase_cost_excluded ? 0 : (part.purchase_price || 0) * qty;
        const revenueHT = (part.unit_price_ht || 0) * qty * sav.revenue_ratio;
        const revenueTTC = (part.unit_price || 0) * qty * sav.revenue_ratio;
        bucket.parts_count += qty;
        bucket.sav_ids.add(sav.id);
        bucket.expenses += expense;
        bucket.revenue += revenueHT;
        bucket.revenue_ttc += revenueTTC;
        bucket.vat_collected += Math.max(0, revenueTTC - revenueHT);

        let tb = bucket.types.get(sav.sav_type);
        if (!tb) {
          tb = { parts_count: 0, sav_ids: new Set(), expenses: 0, revenue: 0, lines: [] };
          bucket.types.set(sav.sav_type, tb);
        }
        tb.parts_count += qty;
        tb.sav_ids.add(sav.id);
        tb.expenses += expense;
        tb.revenue += revenueHT;
        tb.lines.push({
          sav_id: sav.id,
          case_number: sav.case_number,
          customer_name: sav.customer_name,
          part_name: part.name,
          quantity: qty,
          purchase: expense,
          revenue: revenueHT,
          margin: revenueHT - expense,
        });
      }
    }

    const rows: SupplierReportRow[] = Array.from(buckets.values()).map(b => {
      const margin = b.revenue - b.expenses;
      const types: SupplierTypeGroup[] = Array.from(b.types.entries()).map(([sav_type, t]) => ({
        sav_type,
        parts_count: t.parts_count,
        sav_count: t.sav_ids.size,
        expenses: t.expenses,
        revenue: t.revenue,
        margin: t.revenue - t.expenses,
        lines: t.lines.sort((a, c) => c.case_number.localeCompare(a.case_number)),
      })).sort((a, c) => c.expenses - a.expenses);
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
        types,
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
