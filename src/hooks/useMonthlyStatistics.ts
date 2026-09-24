import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { startOfYear, endOfYear } from 'date-fns';
import { computeCaseFinance, computeQuoteRevenue, fetchCountedQuotes, fetchFinanceContext, FINANCE_PARTS_SELECT } from '@/lib/savFinance';

export interface MonthlyData {
  month: number;
  revenue: number;
  costs: number;
  profit: number;
  savCount: number;
  takeover_cost: number;
  client_cost: number;
  external_cost: number;
  overdue_client: number;
  overdue_internal: number;
  overdue_external: number;
}

export function useMonthlyStatistics(year: number) {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const { shop } = useShop();

  useEffect(() => {
    if (!shop?.id) return;

    const fetchMonthlyStatistics = async () => {
      setLoading(true);
      try {
        const yearStart = startOfYear(new Date(year, 0, 1));
        const yearEnd = endOfYear(new Date(year, 0, 1));

        // Règle commune (src/lib/savFinance.ts)
        const ctx = await fetchFinanceContext(shop.id);

        const monthlyData: MonthlyData[] = [];
        for (let i = 0; i < 12; i++) {
          monthlyData.push({
            month: i + 1, revenue: 0, costs: 0, profit: 0, savCount: 0,
            takeover_cost: 0, client_cost: 0, external_cost: 0,
            overdue_client: 0, overdue_internal: 0, overdue_external: 0,
          });
        }

        const { data: savCases, error: savError } = await supabase
          .from('sav_cases')
          .select(`id, created_at, sav_type, status, taken_over, partial_takeover, takeover_amount, ${FINANCE_PARTS_SELECT}`)
          .eq('shop_id', shop.id)
          .in('status', ctx.metricsStatusKeys)
          .gte('created_at', yearStart.toISOString())
          .lte('created_at', yearEnd.toISOString());
        if (savError) throw savError;

        (savCases || []).forEach((savCase: any) => {
          const f = computeCaseFinance(savCase, ctx);
          if (!f.counted) return;
          const m = monthlyData[new Date(savCase.created_at).getMonth()];
          m.revenue += f.revenueHT;
          m.costs += f.cost;
          if (!f.revenueExcluded) m.savCount += 1;
          const share = f.rawRevenueTTC > 0 ? Math.min(1, f.takeoverTTC / f.rawRevenueTTC) : (savCase.taken_over ? 1 : 0);
          m.takeover_cost += f.cost * share;
          if (savCase.sav_type === 'external') m.external_cost += f.cost * (1 - share);
          else if (savCase.sav_type !== 'internal') m.client_cost += f.cost * (1 - share);
        });

        const quotesData = await fetchCountedQuotes(shop.id, yearStart, yearEnd);
        quotesData.forEach((quote: any) => {
          const monthIndex = new Date(quote.created_at).getMonth();
          monthlyData[monthIndex].revenue += computeQuoteRevenue(quote, ctx.billing).revenueHT;
        });

        // Note: le calcul des retards par mois est géré ailleurs (useMonthlyLateRate).
        // L'ancienne requête "tous les SAV clôturés" était chargée puis jamais
        // utilisée : elle est supprimée.


        // Calculer les profits
        monthlyData.forEach(month => {
          month.profit = month.revenue - month.costs;
        });

        setData(monthlyData);
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques mensuelles:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyStatistics();
  }, [shop?.id, year]);

  return {
    data,
    loading
  };
}