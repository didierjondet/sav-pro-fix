import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format, addMonths } from 'date-fns';

export interface MonthlyData {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
  savCount: number;
  takeover_cost: number;
  client_cost: number;
  external_cost: number;
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

        // Initialiser les données pour tous les mois
        const monthlyData: MonthlyData[] = [];
        for (let i = 0; i < 12; i++) {
          const monthDate = addMonths(yearStart, i);
          monthlyData.push({
            month: format(monthDate, 'MMM'),
            revenue: 0,
            costs: 0,
            profit: 0,
            savCount: 0,
            takeover_cost: 0,
            client_cost: 0,
            external_cost: 0
          });
        }

        // Récupérer les SAV de l'année
        const { data: savCases, error: savError } = await supabase
          .from('sav_cases')
          .select(`
            *,
            sav_parts(*, parts(*))
          `)
          .eq('shop_id', shop.id)
          .eq('status', 'ready')
          .gte('created_at', yearStart.toISOString())
          .lte('created_at', yearEnd.toISOString());

        if (savError) throw savError;

        // Traiter chaque SAV
        (savCases || []).forEach((savCase: any) => {
          const monthIndex = new Date(savCase.created_at).getMonth();
          
          let caseCost = 0;
          let caseRevenue = 0;
          let takeover_cost = 0;
          let client_cost = 0;
          let external_cost = 0;

          // Calculer les coûts des pièces
          (savCase.sav_parts || []).forEach((savPart: any) => {
            const qty = Number(savPart.quantity) || 0;
            const purchase = Number(savPart.parts?.purchase_price) || 0;
            const selling = Number(savPart.parts?.selling_price) || 0;
            const unit = Number(savPart.unit_price ?? selling) || 0;

            const partCost = purchase * qty;
            const partRevenue = unit * qty;

            caseCost += partCost;
            caseRevenue += partRevenue;

            // Calculer les coûts par type
            if (savCase.sav_type === 'client') {
              if (savCase.taken_over) {
                takeover_cost += partCost;
              } else if (savCase.partial_takeover && savCase.takeover_amount) {
                const denom = Number(savCase.total_cost) || 1;
                const rawRatio = Number(savCase.takeover_amount) / denom;
                const ratio = Math.min(1, Math.max(0, rawRatio));
                takeover_cost += partCost * ratio;
                client_cost += partCost * (1 - ratio);
              } else {
                client_cost += partCost;
              }
            } else if (savCase.sav_type === 'external') {
              external_cost += partCost;
            }
          });

          // Ajuster le revenu selon la prise en charge
          if (savCase.partial_takeover && savCase.takeover_amount) {
            const denom = Number(savCase.total_cost) || 1;
            const rawRatio = Number(savCase.takeover_amount) / denom;
            const ratio = Math.min(1, Math.max(0, rawRatio));
            caseRevenue = caseCost + (caseRevenue - caseCost) * (1 - ratio);
          } else if (savCase.taken_over) {
            caseRevenue = caseCost;
          }

          // Ajouter aux données mensuelles (exclure SAV internes)
          if (savCase.sav_type !== 'internal') {
            monthlyData[monthIndex].revenue += caseRevenue;
            monthlyData[monthIndex].costs += caseCost;
            monthlyData[monthIndex].savCount += 1;
            monthlyData[monthIndex].takeover_cost += takeover_cost;
            monthlyData[monthIndex].client_cost += client_cost;
            monthlyData[monthIndex].external_cost += external_cost;
          }
        });

        // Récupérer les devis acceptés de l'année
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('total_amount, created_at')
          .eq('status', 'accepted')
          .eq('shop_id', shop.id)
          .gte('created_at', yearStart.toISOString())
          .lte('created_at', yearEnd.toISOString());

        if (quotesError) throw quotesError;

        // Ajouter les revenus des devis aux données mensuelles
        (quotesData || []).forEach((quote: any) => {
          const monthIndex = new Date(quote.created_at).getMonth();
          monthlyData[monthIndex].revenue += Number(quote.total_amount) || 0;
        });

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