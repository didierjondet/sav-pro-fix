import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { useShopSAVTypes } from './useShopSAVTypes';
import { useBillingConfig } from './useBillingConfig';
import { splitTtcHt } from '@/lib/vatCalculator';
import { useShopSAVStatuses } from './useShopSAVStatuses';
import { computeCaseFinance, computeQuoteRevenue, fetchCountedQuotes, getMetricsStatusKeys } from '@/lib/savFinance';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface ReportPartItem {
  name: string;
  quantity: number;
  purchase_price: number;      // HT (déjà HT par convention)
  unit_price: number;          // TTC (tel que saisi)
  unit_price_ht: number;       // HT dérivé
  vat_amount: number;          // TVA unitaire
  supplier_id: string | null;
  supplier_name: string | null;
}

export interface ReportSAVItem {
  id: string;
  case_number: string;
  created_at: string;
  customer_name: string;
  sav_type: string;
  status: string;
  device_brand: string | null;
  device_model: string | null;
  sku: string | null;
  device_imei: string | null;
  purchase_cost: number;       // HT
  selling_price: number;       // TTC (après prise en charge / exclusions)
  selling_price_ht: number;    // HT (après prise en charge / exclusions)
  vat_collected: number;       // TVA collectée (après prise en charge)
  margin: number;              // Marge HT = selling_price_ht - purchase_cost
  parts: ReportPartItem[];
  technician_comments: string | null;
  revenue_ratio: number;       // ratio TTC appliqué (prise en charge)
  purchase_cost_excluded: boolean;
  counted: boolean;            // inclus dans les totaux (statut « inclus dans les statistiques »)
}

export interface ReportTotals {
  revenue: number;         // HT
  revenue_ttc: number;     // TTC
  vat_collected: number;   // TVA collectée
  costs: number;           // HT
  margin: number;          // HT
  count: number;
}

export interface ReportQuoteItem {
  id: string;
  quote_number: string;
  created_at: string;
  revenue: number;
  revenue_ttc: number;
  vat_collected: number;
  margin: number;
}

export interface ReportData {
  items: ReportSAVItem[];
  quotes: ReportQuoteItem[];
  groupedByType: Record<string, ReportSAVItem[]>;
  totals: ReportTotals;
  quoteTotals: ReportTotals;
  subtotals: Record<string, ReportTotals>;
}

export type PeriodType = 'current_month' | 'last_month' | 'custom';

interface UseReportDataParams {
  periodType: PeriodType;
  startDate: Date | null;
  endDate: Date | null;
  selectedTypes: string[];
  selectedStatuses: string[];
}

export function useReportData({
  periodType,
  startDate,
  endDate,
  selectedTypes,
  selectedStatuses
}: UseReportDataParams) {
  const { shop } = useShop();
  const { types: savTypes, allTypes, getTypeInfo } = useShopSAVTypes();
  const { statuses: statusRules } = useShopSAVStatuses();
  const { config: billing } = useBillingConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [rawQuotes, setRawQuotes] = useState<any[]>([]);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodType) {
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'custom':
        return { start: startDate || startOfMonth(now), end: endDate || endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [periodType, startDate, endDate]);

  useEffect(() => {
    if (!shop?.id) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('sav_cases')
          .select(`
            id,
            case_number,
            created_at,
            technician_comments,
            sav_type,
            status,
            device_brand,
            device_model,
            sku,
            device_imei,
            taken_over,
            partial_takeover,
            takeover_amount,
            total_cost,
            customer:customers(first_name, last_name),
            sav_parts(
              quantity,
              unit_price,
              purchase_price,
              custom_part_name,
              part:parts(name, selling_price, purchase_price, supplier_id, supplier:suppliers(id, name))
            )
          `)
          .eq('shop_id', shop.id)
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())
          .order('created_at', { ascending: false });

        if (selectedTypes.length > 0) query = query.in('sav_type', selectedTypes);
        if (selectedStatuses.length > 0) query = query.in('status', selectedStatuses);

        const [{ data, error: fetchError }, quotes] = await Promise.all([
          query,
          fetchCountedQuotes(shop.id, dateRange.start, dateRange.end),
        ]);
        if (fetchError) throw fetchError;

        setRawData(data || []);
        setRawQuotes(quotes);
      } catch (err: any) {
        console.error('Error fetching report data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shop?.id, dateRange.start, dateRange.end, selectedTypes, selectedStatuses]);

  const reportData = useMemo<ReportData>(() => {
    // Règle commune (src/lib/savFinance.ts) — types actifs ET archivés
    const ctx = {
      types: allTypes as any,
      metricsStatusKeys: getMetricsStatusKeys(statusRules),
      billing,
    };
    const items: ReportSAVItem[] = rawData.map(sav => {
      const parts = sav.sav_parts || [];
      const f = computeCaseFinance(sav, ctx);

      const customer = sav.customer;
      const customer_name = customer
        ? `${customer.last_name} ${customer.first_name}`.trim()
        : 'Client inconnu';

      const mappedParts: ReportPartItem[] = parts.map((p: any) => {
        const split = splitTtcHt(p.unit_price || 0, billing);
        return {
          name: p.custom_part_name || p.part?.name || 'Pièce inconnue',
          quantity: p.quantity || 1,
          purchase_price: p.purchase_price || 0,
          unit_price: p.unit_price || 0,
          unit_price_ht: split.ht,
          vat_amount: split.vat,
          supplier_id: p.part?.supplier_id || p.part?.supplier?.id || null,
          supplier_name: p.part?.supplier?.name || null
        };
      });

      return {
        id: sav.id,
        case_number: sav.case_number,
        created_at: sav.created_at,
        customer_name,
        sav_type: sav.sav_type,
        status: sav.status,
        device_brand: sav.device_brand,
        device_model: sav.device_model,
        sku: sav.sku,
        device_imei: sav.device_imei,
        purchase_cost: f.cost,
        selling_price: f.revenueTTC,
        selling_price_ht: f.revenueHT,
        vat_collected: f.vat,
        margin: f.margin,
        parts: mappedParts,
        technician_comments: sav.technician_comments || null,
        revenue_ratio: f.revenueRatio,
        purchase_cost_excluded: f.costExcluded,
        counted: f.counted,
      };
    });

    const groupedByType: Record<string, ReportSAVItem[]> = {};
    const subtotals: Record<string, ReportTotals> = {};

    const emptyTotals = (): ReportTotals => ({
      revenue: 0, revenue_ttc: 0, vat_collected: 0, costs: 0, margin: 0, count: 0,
    });
    const add = (acc: ReportTotals, item: ReportSAVItem) => {
      acc.count += 1;
      if (!item.counted) return; // seuls les statuts « inclus dans les statistiques » comptent
      acc.revenue += item.selling_price_ht;
      acc.revenue_ttc += item.selling_price;
      acc.vat_collected += item.vat_collected;
      acc.costs += item.purchase_cost;
      acc.margin += item.margin;
    };

    const totals = emptyTotals();
    items.forEach(item => {
      if (!groupedByType[item.sav_type]) {
        groupedByType[item.sav_type] = [];
        subtotals[item.sav_type] = emptyTotals();
      }
      groupedByType[item.sav_type].push(item);
      add(subtotals[item.sav_type], item);
      add(totals, item);
    });

    const quoteTotals = emptyTotals();
    const quotes: ReportQuoteItem[] = rawQuotes.map(quote => {
      const revenue = computeQuoteRevenue(quote, billing);
      const vat = Math.max(0, revenue.revenueTTC - revenue.revenueHT);
      quoteTotals.revenue += revenue.revenueHT;
      quoteTotals.revenue_ttc += revenue.revenueTTC;
      quoteTotals.vat_collected += vat;
      quoteTotals.margin += revenue.revenueHT;
      quoteTotals.count += 1;
      return {
        id: quote.id,
        quote_number: quote.quote_number || 'Devis',
        created_at: quote.created_at,
        revenue: revenue.revenueHT,
        revenue_ttc: revenue.revenueTTC,
        vat_collected: vat,
        margin: revenue.revenueHT,
      };
    });

    totals.revenue += quoteTotals.revenue;
    totals.revenue_ttc += quoteTotals.revenue_ttc;
    totals.vat_collected += quoteTotals.vat_collected;
    totals.margin += quoteTotals.margin;

    return { items, quotes, groupedByType, totals, quoteTotals, subtotals };
  }, [rawData, rawQuotes, allTypes, statusRules, billing]);

  return {
    data: reportData,
    loading,
    error,
    dateRange,
    savTypes,
    getTypeInfo,
    billingConfig: billing,
  };
}
