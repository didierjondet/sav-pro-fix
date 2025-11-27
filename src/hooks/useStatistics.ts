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
  completedSavChart: Array<{ date: string; completed: number }>;
  lateRateChart: Array<{ date: string; lateRate: number }>;
  profitabilityChart: Array<{ date: string; revenue: number; expenses: number; profit: number }>;
  topParts: Array<{ name: string; quantity: number; revenue: number }>;
  topDevices: Array<{ model: string; brand: string; count: number }>;
  savStatusDistribution: Array<{ name: string; value: number }>;
  loading: boolean;
}

interface StatisticsFilters {
  savStatuses?: string[] | null;
  savTypes?: string[] | null;
}

export function useStatistics(
  period: '7d' | '30d' | '3m' | '6m' | '1y',
  filters?: StatisticsFilters
): StatisticsData {
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
    completedSavChart: [],
    lateRateChart: [],
    profitabilityChart: [],
    topParts: [],
    topDevices: [],
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

  const normalizeDeviceName = (brand: string, model: string) => {
    // Normaliser la marque (garder en majuscules comme dans les données)
    const normalizedBrand = (brand || 'MARQUE INCONNUE')
      .toUpperCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Supprimer les caractères spéciaux
      .replace(/\s+/g, ' '); // Normaliser les espaces

    // Normaliser le modèle (garder en majuscules comme dans les données)
    let normalizedModel = (model || 'MODÈLE INCONNU')
      .toUpperCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Supprimer les caractères spéciaux
      .replace(/\s+/g, '') // Supprimer tous les espaces pour la comparaison
      .replace(/IPHONE(\d+)/g, 'IPHONE$1') // Standardiser "IPHONE 12" -> "IPHONE12"
      .replace(/SAMSUNG(\w+)/g, 'SAMSUNG$1') // Standardiser "SAMSUNG GALAXY" -> "SAMSUNGGALAXY"
      .replace(/GALAXY(\w+)/g, 'GALAXY$1'); // Standardiser "GALAXY S21" -> "GALAXYS21"

    return {
      normalizedKey: `${normalizedBrand}_${normalizedModel}`,
      displayBrand: brand || 'Marque inconnue',
      displayModel: model || 'Modèle inconnu'
    };
  };

  useEffect(() => {
    if (!shop?.id) return;

    const fetchStatistics = async () => {
      setLoading(true);
      try {
      const { start, end } = getDateRange();

      // Récupérer les types SAV avec leurs délais configurés
      const { data: shopSavTypes, error: typesError } = await supabase
        .from('shop_sav_types')
        .select('type_key, max_processing_days')
        .eq('shop_id', shop.id)
        .eq('is_active', true);

      if (typesError) throw typesError;

      // Récupérer les statuts SAV avec pause_timer
      const { data: shopSavStatuses, error: statusesError } = await supabase
        .from('shop_sav_statuses')
        .select('status_key, pause_timer')
        .eq('shop_id', shop.id)
        .eq('is_active', true);

      if (statusesError) throw statusesError;

      // Récupérer les SAV de la période
      const { data: savCasesRaw, error: savError } = await supabase
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

        // Appliquer les filtres de configuration (statuts / types SAV)
        const savCases = (savCasesRaw || []).filter((savCase: any) => {
          const statusOk =
            !filters?.savStatuses ||
            filters.savStatuses.length === 0 ||
            filters.savStatuses.includes(savCase.status);
          const typeOk =
            !filters?.savTypes ||
            filters.savTypes.length === 0 ||
            filters.savTypes.includes(savCase.sav_type);
          return statusOk && typeOk;
        });

        // Séparer les SAV pour les calculs financiers (ready uniquement) et pour les retards (tous les SAV actifs)
        const readySavCases = (savCases || []).filter((c: any) => c.status === 'ready' && c.sav_type !== 'internal');
        const activeSavCases = (savCases || []).filter((c: any) => 
          c.status !== 'delivered' && c.status !== 'cancelled' && c.sav_type !== 'internal'
        );
        const completedSavCases = (savCases || []).filter((c: any) => c.status === 'delivered' && c.sav_type !== 'internal');

        console.log('🔍 Debug retard - Total SAV récupérés:', savCases?.length || 0);
        console.log('🔍 Debug retard - SAV actifs:', activeSavCases.length);
        console.log('🔍 Debug retard - SAV ready:', readySavCases.length);
        console.log('🔍 Debug retard - Délai max calculé via types SAV');

        // Calculer les revenus et dépenses
        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalTimeMinutes = 0;
        let savWithTimeCount = 0;
        let takeoverAmount = 0;
        let takeoverCount = 0;
        let lateCount = 0;
        const statusCounts: Record<string, number> = {};
        const partsUsage: Record<string, { quantity: number; revenue: number; name: string }> = {};
        const deviceUsage: Record<string, { model: string; brand: string; count: number }> = {};
        const dailyData: Record<string, { revenue: number; expenses: number; count: number; completed: number; lateCount: number; activeCount: number }> = {};

        const currentDate = new Date();
        console.log('🔍 Debug retard - Date actuelle:', currentDate.toISOString());

        // Calculer les données journalières pour tous les SAV (actifs et ready)
        (savCases || []).forEach((savCase: any) => {
          const dateKey = format(new Date(savCase.created_at), 'yyyy-MM-dd');
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { revenue: 0, expenses: 0, count: 0, completed: 0, lateCount: 0, activeCount: 0 };
          }
        });

        // Compter les SAV terminés par jour
        completedSavCases.forEach((savCase: any) => {
          const dateKey = format(new Date(savCase.created_at), 'yyyy-MM-dd');
          if (dailyData[dateKey]) {
            dailyData[dateKey].completed++;
          }
        });

        // Tracking des téléphones les plus réparés (tous les SAV, pas seulement terminés)
        (savCases || []).forEach((savCase: any) => {
          if (savCase.sav_type !== 'internal' && (savCase.device_brand || savCase.device_model)) {
            const { normalizedKey, displayBrand, displayModel } = normalizeDeviceName(
              savCase.device_brand, 
              savCase.device_model
            );
            
            if (!deviceUsage[normalizedKey]) {
              deviceUsage[normalizedKey] = { 
                model: displayModel, 
                brand: displayBrand, 
                count: 0 
              };
            }
            deviceUsage[normalizedKey].count++;
          }

          // Calculer le temps total pour tous les SAV non-internal qui ont un temps > 0
          if (savCase.sav_type !== 'internal' && savCase.total_time_minutes && savCase.total_time_minutes > 0) {
            totalTimeMinutes += savCase.total_time_minutes;
            savWithTimeCount++;
          }
        });

        // Fonction pour obtenir les jours de traitement par défaut
        const getDefaultProcessingDays = (savType: string): number => {
          switch (savType) {
            case 'internal': return 0; // Pas de calcul de retard pour SAV internes
            case 'external': return 7;
            case 'client': return 7;
            default: return 7;
          }
        };

        // D'abord calculer les retards sur TOUS les SAV actifs
        activeSavCases.forEach((savCase: any) => {
          // Vérifier si le statut actuel met le timer en pause
          const statusConfig = shopSavStatuses?.find(s => s.status_key === savCase.status);
          if (statusConfig?.pause_timer) {
            console.log(`⏸️ SAV ${savCase.case_number}: Timer en pause (statut: ${savCase.status})`);
            return; // Ne pas compter comme en retard
          }

          // Trouver la configuration du type SAV
          const typeConfig = shopSavTypes?.find(t => t.type_key === savCase.sav_type);
          const processingDays = typeConfig?.max_processing_days || getDefaultProcessingDays(savCase.sav_type);
          
          // Ignorer les SAV internes (processingDays = 0)
          if (processingDays === 0) {
            return;
          }

          // Utiliser created_at comme date de référence
          const startDate = new Date(savCase.created_at);
          const theoreticalEndDate = new Date(startDate);
          theoreticalEndDate.setDate(theoreticalEndDate.getDate() + processingDays);
          
          const dateKey = format(new Date(savCase.created_at), 'yyyy-MM-dd');
          if (dailyData[dateKey]) {
            dailyData[dateKey].activeCount++;
            
            if (currentDate > theoreticalEndDate) {
              dailyData[dateKey].lateCount++;
              lateCount++;
            }
          }
          
          console.log(`🔍 SAV ${savCase.case_number}:`, {
            status: savCase.status,
            sav_type: savCase.sav_type,
            processing_days_config: processingDays,
            created_at: savCase.created_at,
            startDate: startDate.toISOString(),
            theoreticalEnd: theoreticalEndDate.toISOString(),
            isLate: currentDate > theoreticalEndDate,
            daysDiff: Math.floor((currentDate.getTime() - theoreticalEndDate.getTime()) / (1000 * 60 * 60 * 24))
          });
        });

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

          // Compter les statuts
          const status = savCase.status;
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          // Données journalières pour revenus/expenses
          const dateKey = format(new Date(savCase.created_at), 'yyyy-MM-dd');
          if (dailyData[dateKey]) {
            dailyData[dateKey].revenue += caseRevenue;
            dailyData[dateKey].expenses += caseCost;
            dailyData[dateKey].count += 1;
          }
        });

        // Calculer le taux de retard sur TOUS les SAV actifs
        const lateRate = activeSavCases.length > 0 ? (lateCount / activeSavCases.length) * 100 : 0;
        
        console.log('🔍 Debug retard - Résultat final:', {
          lateCount,
          totalActiveSav: activeSavCases.length,
          lateRate: lateRate.toFixed(2) + '%'
        });

        // Préparer les données pour les graphiques
        const chartData = Object.entries(dailyData)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([date, data]) => ({
            date: format(new Date(date), 'dd/MM'),
            revenue: data.revenue,
            expenses: data.expenses,
            profit: data.revenue - data.expenses,
            count: data.count,
            lateRate: data.activeCount > 0 ? (data.lateCount / data.activeCount) * 100 : 0,
            completed: data.completed
          }));

        const topPartsArray = Object.values(partsUsage)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        const topDevicesArray = Object.values(deviceUsage)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
          name: name === 'pending' ? 'En attente' : 
                name === 'in_progress' ? 'En cours' :
                name === 'ready' ? 'Prêt' :
                name === 'delivered' ? 'Livré' :
                name === 'cancelled' ? 'Annulé' : name,
          value
        }));

        console.log('📊 Statistiques temps:', {
          totalTimeMinutes,
          savWithTimeCount,
          averageTimeHours: savWithTimeCount > 0 ? (totalTimeMinutes / savWithTimeCount / 60).toFixed(1) : 0
        });

        setData({
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalRevenue - totalExpenses,
          savStats: {
            total: (savCases || []).filter((c: any) => c.sav_type !== 'internal').length,
            averageTime: savWithTimeCount > 0 ? Number((totalTimeMinutes / savWithTimeCount / 60).toFixed(1)) : 0,
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
          completedSavChart: chartData.map(d => ({ date: d.date, completed: d.completed })),
          lateRateChart: chartData.map(d => ({ date: d.date, lateRate: d.lateRate })),
          profitabilityChart: chartData.map(d => ({ 
            date: d.date, 
            revenue: d.revenue, 
            expenses: d.expenses, 
            profit: d.profit 
          })),
          topParts: topPartsArray,
          topDevices: topDevicesArray,
          savStatusDistribution: statusDistribution
        });

      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [shop?.id, period, filters?.savStatuses?.join(','), filters?.savTypes?.join(',')]);

  return { ...data, loading };
}