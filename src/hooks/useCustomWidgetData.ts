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

        // Récupérer les types SAV avec leurs délais configurés et exclusions granulaires
        const { data: shopSavTypes, error: typesError } = await supabase
          .from('shop_sav_types')
          .select('type_key, max_processing_days, exclude_from_stats, exclude_purchase_costs, exclude_sales_revenue')
          .eq('shop_id', shop.id)
          .eq('is_active', true);

        if (typesError) throw typesError;

        // Calculer les listes de types exclus (séparément pour coûts et revenus)
        const excludeFromPurchaseCosts = (shopSavTypes || [])
          .filter(t => t.exclude_purchase_costs || t.exclude_from_stats)
          .map(t => t.type_key);
        
        const excludeFromSalesRevenue = (shopSavTypes || [])
          .filter(t => t.exclude_sales_revenue || t.exclude_from_stats)
          .map(t => t.type_key);

        // Types exclus complètement (les deux exclus = pas de calcul du tout)
        const excludedFromStatsTypes = (shopSavTypes || [])
          .filter(t => t.exclude_from_stats || (t.exclude_purchase_costs && t.exclude_sales_revenue))
          .map(t => t.type_key);

        // Récupérer les statuts SAV avec pause_timer
        const { data: shopSavStatuses, error: statusesError } = await supabase
          .from('shop_sav_statuses')
          .select('status_key, pause_timer')
          .eq('shop_id', shop.id)
          .eq('is_active', true);

        if (statusesError) throw statusesError;

        // Récupérer les SAV cases avec leurs pièces
        const { data: savCases, error: savError } = await supabase
          .from('sav_cases')
          .select(`
            *,
            sav_parts(*, part:parts(*))
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
        savCases?.forEach((sav: any) => {
          const monthIndex = new Date(sav.created_at).getMonth();
          
          // Compter les SAV
          monthlyData[monthIndex].monthly_sav_count++;

          // Calculer les coûts et revenus des pièces avec exclusions granulaires
          let savCost = 0;
          let savRevenue = 0;
          
          // Vérifier si ce type exclut les coûts ou revenus
          const excludeCosts = excludeFromPurchaseCosts.includes(sav.sav_type);
          const excludeRevenue = excludeFromSalesRevenue.includes(sav.sav_type);
          
          sav.sav_parts?.forEach((savPart: any) => {
            const qty = Number(savPart.quantity) || 0;
            const purchase = Number(savPart.part?.purchase_price) || 0;
            const selling = Number(savPart.part?.selling_price) || 0;
            const unit = Number(savPart.unit_price ?? selling) || 0;
            
            const partCost = purchase * qty;
            const partRevenue = unit * qty;
            
            // Ajouter les coûts seulement si non exclus
            if (!excludeCosts) {
              savCost += partCost;
            }
            
            // Ajouter les revenus seulement si non exclus
            if (!excludeRevenue) {
              savRevenue += partRevenue;
            }
            
            // Comptabiliser l'usage des pièces (seulement si identifiables)
            const partKey = savPart.part?.name || savPart.custom_part_name;
            if (partKey) {
              partsUsage[partKey] = (partsUsage[partKey] || 0) + qty;
            }
          });
          
          // Ajouter les coûts mensuels (seulement si non exclus)
          if (!excludeCosts) {
            monthlyData[monthIndex].monthly_costs += savCost;
          }

          // Calculer le revenu (uniquement pour les SAV ready, hors types exclus des revenus)
          if (sav.status === 'ready' && !excludeRevenue) {
            // Ajuster le revenu selon la prise en charge
            if (sav.partial_takeover && sav.takeover_amount) {
              const denom = Number(sav.total_cost) || 1;
              const rawRatio = Number(sav.takeover_amount) / denom;
              const ratio = Math.min(1, Math.max(0, rawRatio));
              savRevenue = savCost + (savRevenue - savCost) * (1 - ratio);
            } else if (sav.taken_over) {
              savRevenue = savCost;
            }
            
            monthlyData[monthIndex].monthly_revenue += savRevenue;
            totalRevenue += savRevenue;

            // Calculer la marge (uniquement si ni coûts ni revenus exclus)
            if (!excludeCosts) {
              monthlyData[monthIndex].monthly_margin += savRevenue - savCost;
            }

            // Revenu par type
            if (sav.sav_type === 'client') {
              monthlyData[monthIndex].monthly_client_revenue += savRevenue;
            } else if (sav.sav_type === 'external') {
              monthlyData[monthIndex].monthly_external_revenue += savRevenue;
            }

            // Prises en charge
            if (sav.takeover_amount) {
              takeoverAmount += Number(sav.takeover_amount) || 0;
            }
          }

          // Temps moyen basé sur les temps des pièces
          if (sav.status === 'ready') {
            let totalMinutes = 0;
            sav.sav_parts?.forEach((savPart: any) => {
              const time = (savPart.part?.time_minutes || 15) * (savPart.quantity || 0);
              totalMinutes += time;
            });
            if (totalMinutes > 0) {
              totalSavTime += totalMinutes / 60; // Convertir en heures
              countSavTime++;
            }
          }

          // Taux de retard (pour les SAV actifs)
          if (sav.status !== 'ready' && sav.status !== 'delivered' && sav.status !== 'cancelled') {
            // Vérifier si le statut actuel met le timer en pause
            const statusConfig = shopSavStatuses?.find(s => s.status_key === sav.status);
            if (statusConfig?.pause_timer) {
              return; // Ne pas compter comme SAV actif si timer en pause
            }

            // Trouver la configuration du type SAV
            const typeConfig = shopSavTypes?.find(t => t.type_key === sav.sav_type);
            const getDefaultProcessingDays = (savType: string): number => {
              // Pas de calcul de retard pour types exclus
              if (excludedFromStatsTypes.includes(savType)) return 0;
              switch (savType) {
                case 'external': return 7;
                case 'client': return 7;
                default: return 7;
              }
            };
            const processingDays = typeConfig?.max_processing_days || getDefaultProcessingDays(sav.sav_type);
            
            // Ignorer les SAV internes
            if (processingDays === 0) {
              return;
            }

            activeSavCount++;
            
            // Calculer le retard basé sur created_at + processing days configurés
            const createdDate = new Date(sav.created_at);
            const expectedDate = new Date(createdDate);
            expectedDate.setDate(expectedDate.getDate() + processingDays);
            
            if (new Date() > expectedDate) {
              lateSavCount++;
            }
          }

          // Comptabiliser les appareils
          if (sav.device_brand || sav.device_model) {
            const deviceName = `${sav.device_brand || ''} ${sav.device_model || ''}`.trim();
            devicesCount[deviceName] = (devicesCount[deviceName] || 0) + 1;
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
