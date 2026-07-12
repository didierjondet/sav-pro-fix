import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { useShopSAVTypes } from './useShopSAVTypes';
import { useBillingConfig } from './useBillingConfig';
import { splitTtcHt } from '@/lib/vatCalculator';
import { format, startOfMonth } from 'date-fns';

export interface SupplierMonthlyPoint {
  month: string;
  label: string;
  expenses: number;      // HT
  revenue: number;       // HT
  vat_collected: number;
  margin: number;        // HT
}

export interface SupplierPartRow {
  part_name: string;
  quantity: number;
  expenses: number;      // HT
  revenue: number;       // HT
  vat_collected: number;
  margin: number;        // HT
}

export interface SupplierStatsTotals {
  expenses: number;
  revenue: number;       // HT
  revenue_ttc: number;
  vat_collected: number;
  margin: number;        // HT
  margin_pct: number;
  parts_count: number;
  sav_count: number;
}


export interface SupplierStatsResult {
  totals: SupplierStatsTotals;
  monthly: SupplierMonthlyPoint[];
  byPart: SupplierPartRow[];
}

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function useSupplierStatistics(
  supplierId: string | null | undefined,
  from: Date,
  to: Date,
) {
  const { shop } = useShop();
  const { getTypeInfo } = useShopSAVTypes();
  const { config: billing } = useBillingConfig();

  const query = useQuery({
    queryKey: ['supplier-stats', shop?.id, supplierId, from.toISOString(), to.toISOString()],
    enabled: !!shop?.id && !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sav_cases')
        .select(`
          id,
          created_at,
          sav_type,
          taken_over,
          partial_takeover,
          takeover_amount,
          sav_parts(
            quantity,
            unit_price,
            purchase_price,
            custom_part_name,
            part:parts(name, supplier_id)
          )
        `)
        .eq('shop_id', shop!.id)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());
      if (error) throw error;
      return data || [];
    },
  });

  const result = useMemo<SupplierStatsResult>(() => {
    const monthlyMap = new Map<string, SupplierMonthlyPoint>();
    const partsMap = new Map<string, SupplierPartRow>();
    let totalExpenses = 0;
    let totalRevenueHT = 0;
    let totalRevenueTTC = 0;
    let totalVat = 0;
    let partsCount = 0;
    const savIds = new Set<string>();

    for (const sav of query.data || []) {
      const matchingParts = (sav.sav_parts || []).filter((p: any) => p.part?.supplier_id === supplierId);
      if (matchingParts.length === 0) continue;

      const typeInfo = getTypeInfo(sav.sav_type);
      const allParts = sav.sav_parts || [];
      const rawSelling = allParts.reduce((s: number, p: any) => s + ((p.unit_price || 0) * (p.quantity || 1)), 0);
      let adjSelling = rawSelling;
      if (sav.taken_over && !sav.partial_takeover) adjSelling = 0;
      else if (sav.partial_takeover && sav.takeover_amount) {
        adjSelling = Math.max(0, adjSelling - (Number(sav.takeover_amount) || 0));
      }
      if (typeInfo.exclude_sales_revenue) adjSelling = 0;
      const revenue_ratio = rawSelling > 0 ? adjSelling / rawSelling : 0;
      const purchase_excluded = !!typeInfo.exclude_purchase_costs;

      const d = new Date(sav.created_at);
      const monthKey = format(startOfMonth(d), 'yyyy-MM');
      const monthLabel = `${MONTHS_FR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      let bucket = monthlyMap.get(monthKey);
      if (!bucket) {
        bucket = { month: monthKey, label: monthLabel, expenses: 0, revenue: 0, vat_collected: 0, margin: 0 };
        monthlyMap.set(monthKey, bucket);
      }

      for (const p of matchingParts) {
        const qty = p.quantity || 0;
        const expense = purchase_excluded ? 0 : (p.purchase_price || 0) * qty;
        const split = splitTtcHt(p.unit_price || 0, billing);
        const revenueHT = split.ht * qty * revenue_ratio;
        const revenueTTC = (p.unit_price || 0) * qty * revenue_ratio;
        const vat = Math.max(0, revenueTTC - revenueHT);
        bucket.expenses += expense;
        bucket.revenue += revenueHT;
        bucket.vat_collected += vat;
        bucket.margin += revenueHT - expense;

        totalExpenses += expense;
        totalRevenueHT += revenueHT;
        totalRevenueTTC += revenueTTC;
        totalVat += vat;
        partsCount += qty;
        savIds.add(sav.id);

        const name = p.custom_part_name || p.part?.name || 'Pièce';
        let pr = partsMap.get(name);
        if (!pr) {
          pr = { part_name: name, quantity: 0, expenses: 0, revenue: 0, vat_collected: 0, margin: 0 };
          partsMap.set(name, pr);
        }
        pr.quantity += qty;
        pr.expenses += expense;
        pr.revenue += revenueHT;
        pr.vat_collected += vat;
        pr.margin += revenueHT - expense;
      }
    }

    const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    const byPart = Array.from(partsMap.values()).sort((a, b) => b.expenses - a.expenses);
    const margin = totalRevenueHT - totalExpenses;

    return {
      totals: {
        expenses: totalExpenses,
        revenue: totalRevenueHT,
        revenue_ttc: totalRevenueTTC,
        vat_collected: totalVat,
        margin,
        margin_pct: totalRevenueHT > 0 ? (margin / totalRevenueHT) * 100 : 0,
        parts_count: partsCount,
        sav_count: savIds.size,
      },
      monthly,
      byPart,
    };
  }, [query.data, supplierId, getTypeInfo, billing]);


  return { ...result, isLoading: query.isLoading };
}
