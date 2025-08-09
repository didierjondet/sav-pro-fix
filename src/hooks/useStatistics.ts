import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';

interface StatisticsData {
  revenue: number;
  expenses: number;
  profit: number;
  savStats: {
    total: number;
    averageTime: number;
    lateRate: number;
  };
  partsStats: {
    totalUsed: number;
    averageCost: number;
  };
  takeoverStats: {
    amount: number;
    count: number;
  };
  revenueChart: Array<{ date: string; revenue: number }>;
  savCountChart: Array<{ date: string; count: number }>;
  profitabilityChart: Array<{ date: string; revenue: number; expenses: number; profit: number }>;
  topParts: Array<{ name: string; quantity: number; revenue: number }>;
  savStatusDistribution: Array<{ name: string; value: number }>;
  loading: boolean;
}

export function useStatistics(period: '7d' | '30d' | '3m' | '6m' | '1y'): StatisticsData {
  const { shop } = useShop();
  const [data, setData] = useState<Omit<StatisticsData, 'loading'>>({
    revenue: 0,
    expenses: 0,
    profit: 0,
    savStats: { total: 0, averageTime: 0, lateRate: 0 },
    partsStats: { totalUsed: 0, averageCost: 0 },
    takeoverStats: { amount: 0, count: 0 },
    revenueChart: [],
    savCountChart: [],
    profitabilityChart: [],
    topParts: [],
    savStatusDistribution: []
  });
  const [loading, setLoading] = useState(true);

  const getDateRange = () => {
    const end = new Date();
    let start: Date;
    
    switch (period) {
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '3m':
        start = subMonths(end, 3);
        break;
      case '6m':
        start = subMonths(end, 6);
        break;
      case '1y':
        start = subMonths(end, 12);
        break;
      default:
        start = subDays(end, 30);
    }
    
    return { start: startOfDay(start), end: endOfDay(end) };
  };

  useEffect(() => {
    if (!shop?.id) return;

    const fetchStatistics = async () => {
      setLoading(true);
      try {
        const { start, end } = getDateRange();

        // Récupérer les SAV de la période
        const { data: savCases, error: savError } = await supabase
          .from('sav_cases')
          .select(`
            *,
            customer:customers(*),
            sav_parts(*, part:parts(*))
          `)
          .eq('shop_id', shop.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (savError) throw savError;

        // Séparer les SAV pour les calculs financiers (ready uniquement) et pour les retards (tous les SAV actifs)
        const readySavCases = (savCases || []).filter((c: any) => c.status === 'ready' && c.sav_type !== 'internal');
        const activeSavCases = (savCases || []).filter((c: any) => 
          c.status !== 'delivered' && c.status !== 'cancelled' && c.sav_type !== 'internal'
        );

        // Calculer les revenus et dépenses
        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalTimeFromParts = 0;
        let takeoverAmount = 0;
        let takeoverCount = 0;
        let lateCount = 0;
        const statusCounts: Record<string, number> = {};
        const partsUsage: Record<string, { quantity: number; revenue: number; name: string }> = {};
        const dailyData: Record<string, { revenue: number; expenses: number; count: number }> = {};

        const currentDate = new Date();

        // D'abord calculer les retards sur TOUS les SAV actifs
        activeSavCases.forEach((savCase: any) => {
          const startDate = new Date(savCase.taken_over_at || savCase.created_at);
          const processingDays = shop.max_sav_processing_days_client || 7;
          const theoreticalEndDate = new Date(startDate);
          theoreticalEndDate.setDate(theoreticalEndDate.getDate() + processingDays);
          
          if (currentDate > theoreticalEndDate) {
            lateCount++;
          }
        });

        readySavCases.forEach((savCase: any) => {
          // Calculer le coût total des pièces
          let caseCost = 0;
          let caseRevenue = 0;
          let caseTimeFromParts = 0;

          savCase.sav_parts?.forEach((savPart: any) => {
            const partCost = (savPart.part?.purchase_price || 0) * savPart.quantity;
            const partRevenue = (savPart.unit_price || savPart.part?.selling_price || 0) * savPart.quantity;
            const partTime = (savPart.part?.time_minutes || 15) * savPart.quantity;
            
            caseCost += partCost;
            caseRevenue += partRevenue;
            caseTimeFromParts += partTime;

            // Tracking des pièces les plus utilisées
            const partKey = savPart.part?.name || 'Pièce inconnue';
            if (!partsUsage[partKey]) {
              partsUsage[partKey] = { quantity: 0, revenue: 0, name: partKey };
            }
            partsUsage[partKey].quantity += savPart.quantity;
            partsUsage[partKey].revenue += partRevenue;
          });

          // Calcul du retard déjà fait plus haut pour tous les SAV actifs

          // Calculer les prises en charge
          if (savCase.partial_takeover && savCase.takeover_amount) {
            takeoverAmount += Number(savCase.takeover_amount) || 0;
            takeoverCount++;
            const rawRatio = Number(savCase.takeover_amount) / (Number(savCase.total_cost) || 1);
            const takeoverRatio = Math.min(1, Math.max(0, rawRatio));
            caseRevenue = caseCost + (caseRevenue - caseCost) * (1 - takeoverRatio);
          } else if (savCase.taken_over) {
            takeoverAmount += caseCost;
            takeoverCount++;
            caseRevenue = caseCost; // Pas de marge si pris en charge totalement
          }

          totalRevenue += caseRevenue;
          totalExpenses += caseCost;
          totalTimeFromParts += caseTimeFromParts;

          // Compter les statuts
          const status = savCase.status;
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          // Données journalières
          const dateKey = format(new Date(savCase.created_at), 'yyyy-MM-dd');
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { revenue: 0, expenses: 0, count: 0 };
          }
          dailyData[dateKey].revenue += caseRevenue;
          dailyData[dateKey].expenses += caseCost;
          dailyData[dateKey].count += 1;
        });

        // Calculer le taux de retard sur TOUS les SAV actifs
        const lateRate = activeSavCases.length > 0 ? (lateCount / activeSavCases.length) * 100 : 0;

        // Préparer les données pour les graphiques
        const chartData = Object.entries(dailyData)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([date, data]) => ({
            date: format(new Date(date), 'dd/MM'),
            revenue: data.revenue,
            expenses: data.expenses,
            profit: data.revenue - data.expenses,
            count: data.count
          }));

        const topPartsArray = Object.values(partsUsage)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
          name: name === 'pending' ? 'En attente' : 
                name === 'in_progress' ? 'En cours' :
                name === 'ready' ? 'Prêt' :
                name === 'delivered' ? 'Livré' :
                name === 'cancelled' ? 'Annulé' : name,
          value
        }));

        setData({
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalRevenue - totalExpenses,
          savStats: {
            total: readySavCases.length || 0,
            averageTime: readySavCases.length ? Math.round(totalTimeFromParts / readySavCases.length / 60) : 0,
            lateRate: lateRate
          },
          partsStats: {
            totalUsed: Object.values(partsUsage).reduce((sum, part) => sum + part.quantity, 0),
            averageCost: totalExpenses / (readySavCases.length || 1)
          },
          takeoverStats: {
            amount: takeoverAmount,
            count: takeoverCount
          },
          revenueChart: chartData.map(d => ({ date: d.date, revenue: d.revenue })),
          savCountChart: chartData.map(d => ({ date: d.date, count: d.count })),
          profitabilityChart: chartData.map(d => ({ 
            date: d.date, 
            revenue: d.revenue, 
            expenses: d.expenses, 
            profit: d.profit 
          })),
          topParts: topPartsArray,
          savStatusDistribution: statusDistribution
        });

      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [shop?.id, period]);

  return { ...data, loading };
}