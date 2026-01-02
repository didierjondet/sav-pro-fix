import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { useShopSAVTypes } from './useShopSAVTypes';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface ReportPartItem {
  name: string;
  quantity: number;
  purchase_price: number;
  unit_price: number;
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
  purchase_cost: number;
  selling_price: number;
  margin: number;
  parts: ReportPartItem[];
}

export interface ReportData {
  items: ReportSAVItem[];
  groupedByType: Record<string, ReportSAVItem[]>;
  totals: {
    revenue: number;
    costs: number;
    margin: number;
    count: number;
  };
  subtotals: Record<string, {
    revenue: number;
    costs: number;
    margin: number;
    count: number;
  }>;
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
  const { types: savTypes, getTypeInfo } = useShopSAVTypes();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);

  // Calculate date range based on period type
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodType) {
      case 'current_month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'custom':
        return {
          start: startDate || startOfMonth(now),
          end: endDate || endOfMonth(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  }, [periodType, startDate, endDate]);

  useEffect(() => {
    if (!shop?.id) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch SAV cases with parts and customer info
        let query = supabase
          .from('sav_cases')
          .select(`
            id,
            case_number,
            created_at,
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
              part:parts(name)
            )
          `)
          .eq('shop_id', shop.id)
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString())
          .order('created_at', { ascending: false });

        // Apply type filter if specified
        if (selectedTypes.length > 0) {
          query = query.in('sav_type', selectedTypes);
        }

        // Apply status filter if specified
        if (selectedStatuses.length > 0) {
          query = query.in('status', selectedStatuses);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setRawData(data || []);
      } catch (err: any) {
        console.error('Error fetching report data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shop?.id, dateRange.start, dateRange.end, selectedTypes, selectedStatuses]);

  // Process raw data into report format
  const reportData = useMemo<ReportData>(() => {
    const items: ReportSAVItem[] = rawData.map(sav => {
      const parts = sav.sav_parts || [];
      
      // Récupérer les informations du type de SAV pour les exclusions
      const typeInfo = getTypeInfo(sav.sav_type);
      
      // Calculer les coûts bruts
      let purchase_cost = parts.reduce((sum: number, p: any) => 
        sum + ((p.purchase_price || 0) * (p.quantity || 1)), 0);
      let selling_price = parts.reduce((sum: number, p: any) => 
        sum + ((p.unit_price || 0) * (p.quantity || 1)), 0);
      
      // Ajuster le CA selon la prise en charge
      if (sav.taken_over && !sav.partial_takeover) {
        // Prise en charge totale : le client ne paie rien
        selling_price = 0;
      } else if (sav.partial_takeover && sav.takeover_amount) {
        // Prise en charge partielle : soustraire le montant pris en charge
        const takeoverAmt = Number(sav.takeover_amount) || 0;
        selling_price = Math.max(0, selling_price - takeoverAmt);
      }
      
      // Appliquer les exclusions configurées dans le type de SAV
      if (typeInfo.exclude_purchase_costs) {
        purchase_cost = 0;
      }
      if (typeInfo.exclude_sales_revenue) {
        selling_price = 0;
      }
      
      const margin = selling_price - purchase_cost;

      const customer = sav.customer;
      const customer_name = customer 
        ? `${customer.last_name} ${customer.first_name}`.trim()
        : 'Client inconnu';

      // Map parts for display
      const mappedParts: ReportPartItem[] = parts.map((p: any) => ({
        name: p.custom_part_name || p.part?.name || 'Pièce inconnue',
        quantity: p.quantity || 1,
        purchase_price: p.purchase_price || 0,
        unit_price: p.unit_price || 0
      }));

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
        purchase_cost,
        selling_price,
        margin,
        parts: mappedParts
      };
    });

    // Group by type
    const groupedByType: Record<string, ReportSAVItem[]> = {};
    const subtotals: Record<string, { revenue: number; costs: number; margin: number; count: number }> = {};

    items.forEach(item => {
      if (!groupedByType[item.sav_type]) {
        groupedByType[item.sav_type] = [];
        subtotals[item.sav_type] = { revenue: 0, costs: 0, margin: 0, count: 0 };
      }
      groupedByType[item.sav_type].push(item);
      subtotals[item.sav_type].revenue += item.selling_price;
      subtotals[item.sav_type].costs += item.purchase_cost;
      subtotals[item.sav_type].margin += item.margin;
      subtotals[item.sav_type].count += 1;
    });

    // Calculate totals
    const totals = items.reduce((acc, item) => ({
      revenue: acc.revenue + item.selling_price,
      costs: acc.costs + item.purchase_cost,
      margin: acc.margin + item.margin,
      count: acc.count + 1
    }), { revenue: 0, costs: 0, margin: 0, count: 0 });

    return {
      items,
      groupedByType,
      totals,
      subtotals
    };
  }, [rawData, getTypeInfo]);

  return {
    data: reportData,
    loading,
    error,
    dateRange,
    savTypes,
    getTypeInfo
  };
}
