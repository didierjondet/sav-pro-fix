import { useState, useEffect } from 'react';
import { useShop } from '@/contexts/ShopContext';
import { supabase } from '@/integrations/supabase/client';

export interface MetricDefinition {
  key: string;
  label: string;
  description: string;
  category: 'monthly' | 'aggregate' | 'ranking';
}

export const AVAILABLE_METRICS: MetricDefinition[] = [
  // Métriques mensuelles
  {
    key: 'monthly_revenue',
    label: 'Revenu mensuel',
    description: 'Revenu total par mois (SAV ready uniquement)',
    category: 'monthly'
  },
  {
    key: 'monthly_sav_count',
    label: 'Nombre de SAV',
    description: 'Nombre de dossiers SAV créés par mois',
    category: 'monthly'
  },
  {
    key: 'monthly_margin',
    label: 'Marge mensuelle',
    description: 'Marge = revenu - coûts par mois',
    category: 'monthly'
  },
  {
    key: 'monthly_costs',
    label: 'Coûts mensuels',
    description: 'Coûts totaux des pièces par mois',
    category: 'monthly'
  },
  {
    key: 'monthly_client_revenue',
    label: 'Revenu client',
    description: 'Revenu des SAV clients par mois',
    category: 'monthly'
  },
  {
    key: 'monthly_external_revenue',
    label: 'Revenu externe',
    description: 'Revenu des SAV externes par mois',
    category: 'monthly'
  },
  // Métriques agrégées
  {
    key: 'total_revenue',
    label: 'Revenu total',
    description: 'Revenu total sur la période',
    category: 'aggregate'
  },
  {
    key: 'average_sav_time',
    label: 'Temps moyen',
    description: 'Temps moyen de réparation (heures)',
    category: 'aggregate'
  },
  {
    key: 'late_rate_percentage',
    label: 'Taux de retard',
    description: 'Pourcentage de SAV en retard',
    category: 'aggregate'
  },
  {
    key: 'takeover_amount',
    label: 'Prises en charge',
    description: 'Montant total des prises en charge',
    category: 'aggregate'
  },
  // Classements
  {
    key: 'top_parts_usage',
    label: 'Top pièces',
    description: 'Top 5 des pièces les plus utilisées',
    category: 'ranking'
  },
  {
    key: 'top_devices',
    label: 'Top appareils',
    description: 'Top 5 des appareils réparés',
    category: 'ranking'
  }
];

interface UseCustomWidgetDataProps {
  metrics: string[];
  filters?: {
    year?: number;
    status?: string;
  };
  groupBy?: string;
}

interface MonthlyData {
  month: string;
  monthly_revenue: number;
  monthly_sav_count: number;
  monthly_margin: number;
  monthly_costs: number;
  monthly_client_revenue: number;
  monthly_external_revenue: number;
}

export const useCustomWidgetData = ({ metrics, filters, groupBy }: UseCustomWidgetDataProps) => {
  const { shop } = useShop();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!shop.id) return;

      setLoading(true);
      try {
        const year = filters?.year || new Date().getFullYear();
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        // Récupérer les SAV cases
        const { data: savCases, error: savError } = await supabase
          .from('sav_cases')
          .select(`
            *,
            sav_parts_requirements (
              id,
              quantity,
              unit_price,
              part:parts (
                name,
                reference
              )
            )
          `)
          .eq('shop_id', shop.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (savError) throw savError;

        // Initialiser les données mensuelles
        const monthlyData: MonthlyData[] = Array.from({ length: 12 }, (_, i) => ({
          month: new Date(year, i).toLocaleString('fr-FR', { month: 'short' }),
          monthly_revenue: 0,
          monthly_sav_count: 0,
          monthly_margin: 0,
          monthly_costs: 0,
          monthly_client_revenue: 0,
          monthly_external_revenue: 0
        }));

        let totalRevenue = 0;
        let totalSavTime = 0;
        let countSavTime = 0;
        let lateSavCount = 0;
        let activeSavCount = 0;
        let takeoverAmount = 0;
        const partsUsage: Record<string, number> = {};
        const devicesCount: Record<string, number> = {};

        // Traiter chaque SAV
        savCases?.forEach(sav => {
          const monthIndex = new Date(sav.created_at).getMonth();
          
          // Compter les SAV
          monthlyData[monthIndex].monthly_sav_count++;

          // Calculer les coûts des pièces
          let savCost = 0;
          sav.sav_parts_requirements?.forEach((req: any) => {
            const cost = (req.quantity || 0) * (req.unit_price || 0);
            savCost += cost;
            
            // Comptabiliser l'usage des pièces
            if (req.part?.name) {
              partsUsage[req.part.name] = (partsUsage[req.part.name] || 0) + (req.quantity || 0);
            }
          });
          
          monthlyData[monthIndex].monthly_costs += savCost;

          // Calculer le revenu (uniquement pour les SAV ready)
          if (sav.status === 'ready') {
            const revenue = sav.total_price || 0;
            monthlyData[monthIndex].monthly_revenue += revenue;
            totalRevenue += revenue;

            // Calculer la marge
            monthlyData[monthIndex].monthly_margin += revenue - savCost;

            // Revenu par type
            if (sav.type === 'client') {
              monthlyData[monthIndex].monthly_client_revenue += revenue;
            } else if (sav.type === 'external') {
              monthlyData[monthIndex].monthly_external_revenue += revenue;
            }

            // Prises en charge
            if (sav.takeover_amount) {
              takeoverAmount += sav.takeover_amount;
            }
          }

          // Temps moyen (pour les SAV terminés)
          if (sav.status === 'ready' && sav.created_at && sav.ready_at) {
            const timeInHours = (new Date(sav.ready_at).getTime() - new Date(sav.created_at).getTime()) / (1000 * 60 * 60);
            totalSavTime += timeInHours;
            countSavTime++;
          }

          // Taux de retard (pour les SAV actifs)
          if (sav.status !== 'ready' && sav.status !== 'closed') {
            activeSavCount++;
            if (sav.expected_date && new Date(sav.expected_date) < new Date()) {
              lateSavCount++;
            }
          }

          // Comptabiliser les appareils
          if (sav.device_type) {
            devicesCount[sav.device_type] = (devicesCount[sav.device_type] || 0) + 1;
          }
        });

        // Calculer les métriques agrégées
        const aggregateData = {
          total_revenue: totalRevenue,
          average_sav_time: countSavTime > 0 ? Math.round(totalSavTime / countSavTime) : 0,
          late_rate_percentage: activeSavCount > 0 ? Math.round((lateSavCount / activeSavCount) * 100) : 0,
          takeover_amount: takeoverAmount
        };

        // Top pièces
        const topParts = Object.entries(partsUsage)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        // Top appareils
        const topDevices = Object.entries(devicesCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        // Créer le résultat final en fonction des métriques demandées
        let result: any[] = [];

        if (groupBy === 'month') {
          // Données mensuelles
          result = monthlyData.map(month => {
            const row: any = { month: month.month };
            metrics.forEach(metric => {
              if (metric in month) {
                row[metric] = month[metric as keyof MonthlyData];
              }
            });
            return row;
          });
        } else if (metrics.some(m => m.startsWith('top_'))) {
          // Classements
          if (metrics.includes('top_parts_usage')) {
            result = topParts;
          } else if (metrics.includes('top_devices')) {
            result = topDevices;
          }
        } else {
          // Métriques agrégées
          const row: any = {};
          metrics.forEach(metric => {
            if (metric in aggregateData) {
              row[metric] = aggregateData[metric as keyof typeof aggregateData];
            }
          });
          result = [row];
        }

        setData(result);
      } catch (error) {
        console.error('Error fetching custom widget data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shop.id, JSON.stringify(metrics), JSON.stringify(filters), groupBy]);

  return { data, loading };
};
