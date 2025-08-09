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
  };
  partsStats: {
    totalUsed: number;
    averageCost: number;
  };
  customerStats: {
    active: number;
    new: number;
    averageRevenue: number;
    averageSav: number;
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
    savStats: { total: 0, averageTime: 0 },
    partsStats: { totalUsed: 0, averageCost: 0 },
    customerStats: { active: 0, new: 0, averageRevenue: 0, averageSav: 0 },
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

        // Ne prendre en compte que les dossiers au statut "ready"
        const readySavCases = (savCases || []).filter((c: any) => c.status === 'ready');

        // Calculer les revenus et dépenses
        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalTime = 0;
        const statusCounts: Record<string, number> = {};
        const partsUsage: Record<string, { quantity: number; revenue: number; name: string }> = {};
        const dailyData: Record<string, { revenue: number; expenses: number; count: number }> = {};

        readySavCases.forEach((savCase: any) => {
          // Calculer le coût total des pièces
          let caseCost = 0;
          let caseRevenue = 0;

          savCase.sav_parts?.forEach((savPart: any) => {
            const partCost = (savPart.part?.purchase_price || 0) * savPart.quantity;
            const partRevenue = (savPart.unit_price || savPart.part?.selling_price || 0) * savPart.quantity;
            
            caseCost += partCost;
            caseRevenue += partRevenue;

            // Tracking des pièces les plus utilisées
            const partKey = savPart.part?.name || 'Pièce inconnue';
            if (!partsUsage[partKey]) {
              partsUsage[partKey] = { quantity: 0, revenue: 0, name: partKey };
            }
            partsUsage[partKey].quantity += savPart.quantity;
            partsUsage[partKey].revenue += partRevenue;
          });

          // Ajuster selon la prise en charge
          if (savCase.partial_takeover && savCase.takeover_amount) {
            const rawRatio = Number(savCase.takeover_amount) / (Number(savCase.total_cost) || 1);
            const takeoverRatio = Math.min(1, Math.max(0, rawRatio));
            caseRevenue = caseCost + (caseRevenue - caseCost) * (1 - takeoverRatio);
          } else if (savCase.taken_over) {
            caseRevenue = caseCost; // Pas de marge si pris en charge totalement
          }

          totalRevenue += caseRevenue;
          totalExpenses += caseCost;
          totalTime += savCase.total_time_minutes || 0;

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

        // Récupérer les statistiques clients
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('shop_id', shop.id);

        const { data: newCustomers } = await supabase
          .from('customers')
          .select('*')
          .eq('shop_id', shop.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

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
            averageTime: readySavCases.length ? Math.round(totalTime / readySavCases.length / 60) : 0
          },
          partsStats: {
            totalUsed: Object.values(partsUsage).reduce((sum, part) => sum + part.quantity, 0),
            averageCost: totalExpenses / (readySavCases.length || 1)
          },
          customerStats: {
            active: customers?.length || 0,
            new: newCustomers?.length || 0,
            averageRevenue: totalRevenue / (customers?.length || 1),
            averageSav: (readySavCases.length || 0) / (customers?.length || 1)
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