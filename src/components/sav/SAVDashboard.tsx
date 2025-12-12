import { useState, useMemo, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, HardDrive, Calendar, Info, Medal, Trophy, Award } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { SAVForm } from './SAVForm';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShop } from '@/hooks/useShop';
import { useSAVPartsCosts } from '@/hooks/useSAVPartsCosts';
import { useShopStorageUsage } from '@/hooks/useStorageUsage';
import { useMonthlyStatistics } from '@/hooks/useMonthlyStatistics';
import { useStatistics } from '@/hooks/useStatistics';
import { useWidgetConfiguration } from '@/hooks/useWidgetConfiguration';
import { calculateSAVDelay } from '@/hooks/useSAVDelay';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useSatisfactionSurveys } from '@/hooks/useSatisfactionSurveys';
import { format, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { DraggableStatisticsWidget } from '@/components/statistics/DraggableStatisticsWidget';
import { useStatisticsConfig, StatisticModule } from '@/hooks/useStatisticsConfig';
import { SortableBlock } from '@/components/statistics/SortableBlock';
import { WidgetManager } from '@/components/statistics/WidgetManager';
import { CustomWidgetRenderer } from '@/components/statistics/CustomWidgetRenderer';
import { FinancialOverviewWidget } from '@/components/statistics/advanced/FinancialOverviewWidget';
import { SAVPerformanceWidget } from '@/components/statistics/advanced/SAVPerformanceWidget';
import { PartsUsageHeatmapWidget } from '@/components/statistics/advanced/PartsUsageHeatmapWidget';
import { MonthlyComparisonWidget } from '@/components/statistics/advanced/MonthlyComparisonWidget';
import { RevenueBreakdownWidget } from '@/components/statistics/advanced/RevenueBreakdownWidget';
import { CustomerSatisfactionWidget } from '@/components/statistics/advanced/CustomerSatisfactionWidget';
import { MonthlyLateRateChart } from '@/components/statistics/widgets/MonthlyLateRateChart';

// Limite de stockage par magasin (500 MB = 0.5 GB)
const STORAGE_LIMIT_GB = 0.5;

// Type pour les périodes de statistiques
type StatisticsPeriod = '7d' | '30d' | '1m_calendar' | '3m' | '6m' | '1y';

// Composant wrapper pour appliquer les configurations individuelles des widgets
interface DashboardWidgetContainerProps {
  widgetId: string;
  children: (stats: ReturnType<typeof useStatistics>, periodLabel: string) => ReactNode;
}

function DashboardWidgetContainer({ widgetId, children }: DashboardWidgetContainerProps) {
  const { config } = useWidgetConfiguration(widgetId);
  
  // Mapper la temporalité configurée vers la période useStatistics
  const effectivePeriod: StatisticsPeriod = 
    config?.temporality === 'monthly' ? '30d'
    : config?.temporality === 'monthly_calendar' ? '1m_calendar'
    : config?.temporality === 'quarterly' ? '3m'
    : config?.temporality === 'yearly' ? '1y'
    : '30d';
  
  // Label pour l'affichage
  const periodLabel = 
    config?.temporality === 'monthly' ? '30 derniers jours'
    : config?.temporality === 'monthly_calendar' ? 'Ce mois (calendaire)'
    : config?.temporality === 'quarterly' ? '3 derniers mois'
    : config?.temporality === 'yearly' ? 'Cette année'
    : '30 derniers jours';
  
  const stats = useStatistics(effectivePeriod, {
    savStatuses: config?.sav_statuses_filter ?? undefined,
    savTypes: config?.sav_types_filter ?? undefined,
  });
  
  return <>{children(stats, periodLabel)}</>;
}

export function SAVDashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isWidgetDialogOpen, setIsWidgetDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { cases, loading } = useSAVCases();
  const { shop } = useShop();
  const { costs, loading: costsLoading } = useSAVPartsCosts();
  const { storageGB, loading: storageLoading } = useShopStorageUsage(shop?.id);
  const { data: monthlyData, loading: monthlyLoading } = useMonthlyStatistics(selectedYear);
  const { getAllTypes, getTypeInfo, types } = useShopSAVTypes();
  const navigate = useNavigate();

  // Hook pour les statistiques par défaut (pour widgets non configurables)
  const defaultStatistics = useStatistics('30d');
  
  // Hook pour les données de satisfaction client
  const satisfactionStats = useSatisfactionSurveys();
  const { modules, reorderModules, updateModule, refetch } = useStatisticsConfig();
  const [sortedModules, setSortedModules] = useState<StatisticModule[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    // Liste des widgets Advanced (trop grands pour le dashboard)
    const advancedModuleIds = ['financial-overview', 'performance-trends', 'parts-usage-heatmap'];
    
    const enabled = modules
      .filter(m => {
        if (!m.enabled) return false;
        if (m.isCustom) return true; // Toujours inclure les widgets personnalisés
        // Exclure uniquement les widgets avancés
        return !advancedModuleIds.includes(m.id);
      })
      .sort((a, b) => a.order - b.order);
    console.log('📊 Dashboard enabled modules:', enabled);
    console.log('🎨 Dashboard custom widgets:', enabled.filter(m => m.isCustom));
    setSortedModules(enabled);
  }, [modules]);
  // Déplacement et sauvegarde de l'ordre
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedModules.findIndex(m => m.id === active.id);
    const newIndex = sortedModules.findIndex(m => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(sortedModules, oldIndex, newIndex);
    setSortedModules(newOrder);

    // Liste des widgets Advanced pour la logique de filtrage
    const advancedModuleIds = ['financial-overview', 'performance-trends', 'parts-usage-heatmap'];
    
    // Créer 3 groupes distincts pour préserver TOUS les widgets
    const visibleIds = new Set(newOrder.map(m => m.id));
    
    // 1. Widgets désactivés (à préserver !)
    const disabledWidgets = modules.filter(m => 
      !m.enabled && !visibleIds.has(m.id)
    );
    
    // 2. Widgets Advanced (exclus du dashboard mais à préserver)
    const advancedWidgets = modules.filter(m => 
      advancedModuleIds.includes(m.id) && !visibleIds.has(m.id)
    );
    
    // 3. Autres widgets non visibles
    const otherWidgets = modules.filter(m =>
      !visibleIds.has(m.id) &&
      !advancedModuleIds.includes(m.id) &&
      m.enabled
    );

    // Merger: widgets visibles + désactivés + advanced + autres
    const merged = [
      ...newOrder,
      ...disabledWidgets.sort((a, b) => a.order - b.order),
      ...advancedWidgets.sort((a, b) => a.order - b.order),
      ...otherWidgets.sort((a, b) => a.order - b.order)
    ];
    
    console.log('🔄 Reordering modules:', {
      visible: newOrder.length,
      disabled: disabledWidgets.length,
      advanced: advancedWidgets.length,
      other: otherWidgets.length,
      total: merged.length
    });
    
    reorderModules(merged);
  };

  const handleRemoveWidget = (moduleId: string) => {
    updateModule(moduleId, { enabled: false });
  };

  // Fonctions pour naviguer vers les SAV filtrés avec types dynamiques
  const navigateToFilteredSAV = (filterType: string) => {
    const params = new URLSearchParams();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    switch (filterType) {
      case 'revenue':
        params.append('status', 'ready');
        params.append('month', currentMonth.toString());
        params.append('year', currentYear.toString());
        break;
      case 'takeover':
        // Rechercher le type 'client' ou utiliser le premier type disponible
        const clientType = getAllTypes().find(t => t.value === 'client');
        if (clientType) {
          params.append('sav_type', clientType.value);
        }
        params.append('taken_over', 'true');
        params.append('month', currentMonth.toString());
        params.append('year', currentYear.toString());
        break;
      default:
        // Pour les types de SAV, exclure les SAV "prêts"
        const selectedType = getAllTypes().find(t => t.value === filterType);
        if (selectedType) {
          params.append('sav_type', selectedType.value);
        }
        params.append('exclude_ready', 'true'); // Nouveau paramètre pour exclure les SAV prêts
        break;
    }
    
    navigate(`/sav?${params.toString()}`);
  };

  // Utiliser les fonctions utilitaires des statuts personnalisés
  const { getStatusInfo, isReadyStatus, isCancelledStatus, isActiveStatus } = useShopSAVStatuses();

  // Calculer les SAV concernés pour les tooltips (mois en cours) - données réelles
  const getSAVTooltipInfo = (filterType: string) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    switch (filterType) {
      case 'revenue':
        // SAV prêts non internes du mois
        const readySAVs = cases.filter(c => 
          isReadyStatus(c.status) && 
          c.sav_type !== 'internal' &&
          new Date(c.created_at) >= monthStart && 
          new Date(c.created_at) <= monthEnd
        );
        return {
          count: readySAVs.length,
          description: `SAV prêts (hors internes) + devis acceptés ce mois`,
          cases: readySAVs,
          amount: costs.monthly_revenue
        };
      
      case 'takeover':
        // SAV client avec prise en charge totale ou partielle
        const takeoverSAVs = cases.filter(c => 
          c.sav_type === 'client' && 
          isReadyStatus(c.status) &&
          (c.taken_over || c.partial_takeover) &&
          new Date(c.created_at) >= monthStart && 
          new Date(c.created_at) <= monthEnd
        );
        return {
          count: takeoverSAVs.length,
          description: `SAV client pris en charge (total ou partiel) ce mois`,
          cases: takeoverSAVs,
          amount: costs.takeover_cost
        };
      
      case 'internal':
        // SAV internes prêts
        const internalSAVs = cases.filter(c => 
          c.sav_type === 'internal' && 
          isReadyStatus(c.status) &&
          new Date(c.created_at) >= monthStart && 
          new Date(c.created_at) <= monthEnd
        );
        return {
          count: internalSAVs.length,
          description: `SAV magasin (internes) prêts ce mois`,
          cases: internalSAVs,
          amount: costs.internal_cost
        };
      
      case 'client':
        // SAV client sans prise en charge
        const clientSAVs = cases.filter(c => 
          c.sav_type === 'client' && 
          isReadyStatus(c.status) &&
          !c.taken_over && 
          !c.partial_takeover &&
          new Date(c.created_at) >= monthStart && 
          new Date(c.created_at) <= monthEnd
        );
        return {
          count: clientSAVs.length,
          description: `SAV client non pris en charge ce mois`,
          cases: clientSAVs,
          amount: costs.client_cost
        };
      
      default:
        return { count: 0, description: '', cases: [], amount: 0 };
    }
  };

  // Calculer les SAV par type (hors SAV "prêts") pour les tooltips
  const getSAVTypeTooltipInfo = (savType: string) => {
    // SAV actifs (hors "prêts") du type donné
    const activeSAVs = cases.filter(c => 
      c.sav_type === savType && 
      !isReadyStatus(c.status)
    );
    
    const typeInfo = getTypeInfo(savType);
    
    return {
      count: activeSAVs.length,
      description: `SAV ${typeInfo.label} actifs (hors "prêts")`,
      cases: activeSAVs,
      amount: 0
    };
  };

  // Calculs pour les statistiques annuelles
  const yearlyStats = useMemo(() => {
    if (monthlyLoading) return {
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0,
      totalSavs: 0,
      avgMonthlySavs: 0
    };
    const totals = monthlyData.reduce((acc, month) => ({
      totalRevenue: acc.totalRevenue + month.revenue,
      totalCosts: acc.totalCosts + month.costs,
      totalProfit: acc.totalProfit + month.profit,
      totalSavs: acc.totalSavs + month.savCount
    }), {
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0,
      totalSavs: 0
    });
    return {
      ...totals,
      avgMonthlySavs: Math.round(totals.totalSavs / 12)
    };
  }, [monthlyData, monthlyLoading]);

  // Générer les années disponibles (5 années passées + année courante + 1 année future)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  }, []);

  // Calculs pour le stockage
  const storageUsagePercent = useMemo(() => {
    if (storageLoading) return 0;
    return Math.min(storageGB / STORAGE_LIMIT_GB * 100, 100);
  }, [storageGB, storageLoading]);
  const storageChartData = useMemo(() => {
    if (storageLoading) return [];
    const usedGB = Math.min(storageGB, STORAGE_LIMIT_GB);
    const freeGB = Math.max(STORAGE_LIMIT_GB - storageGB, 0);
    return [{
      name: 'Espace utilisé',
      value: usedGB,
      color: storageUsagePercent > 80 ? '#ef4444' : '#3b82f6'
    }, {
      name: 'Espace libre',
      value: freeGB,
      color: '#e5e7eb'
    }];
  }, [storageGB, storageLoading, storageUsagePercent]);

  // Données pour le graphique de répartition des SAV avec types dynamiques
  const savDistributionData = useMemo(() => {
    const availableTypes = getAllTypes();
    
    return availableTypes.map(type => {
      const count = cases.filter(c => c.sav_type === type.value).length;
      return {
        name: type.label,
        value: count,
        color: type.color
      };
    }).filter(item => item.value > 0); // Ne montrer que les types avec des SAV
  }, [cases, getAllTypes]);

  // Données pour le graphique de rentabilité
  const profitabilityData = useMemo(() => {
    if (costsLoading) return [];
    const totalCosts = costs.takeover_cost + costs.client_cost + costs.external_cost + costs.internal_cost;
    const profit = costs.monthly_revenue - totalCosts;
    return [{
      name: 'Rentabilité',
      'Chiffre d\'affaires': costs.monthly_revenue,
      'Coûts': totalCosts,
      'Marge': profit
    }];
  }, [costs, costsLoading]);

  // Rendu d'une section selon son id
  const renderSection = (id: string) => {
    switch (id) {
      // Widget sav-types-grid supprimé
      case 'finance-kpis':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card 
                    className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md"
                    onClick={() => navigateToFilteredSAV('revenue')}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {costsLoading ? '...' : `${costs.monthly_revenue.toFixed(2)} €`}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ce mois-ci
                      </p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>SAV prêts + devis acceptés ce mois</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Coûts totaux</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {costsLoading ? '...' : `${(costs.takeover_cost + costs.client_cost + costs.external_cost + costs.internal_cost).toFixed(2)} €`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce mois-ci
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Marge nette</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${costsLoading ? '' : 
                  (costs.monthly_revenue - (costs.takeover_cost + costs.client_cost + costs.external_cost + costs.internal_cost)) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {costsLoading ? '...' : `${(costs.monthly_revenue - (costs.takeover_cost + costs.client_cost + costs.external_cost + costs.internal_cost)).toFixed(2)} €`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce mois-ci
                </p>
              </CardContent>
            </Card>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card 
                    className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md"
                    onClick={() => navigateToFilteredSAV('takeover')}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Prises en charge</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {costsLoading ? '...' : `${costs.takeover_cost.toFixed(2)} €`}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ce mois-ci
                      </p>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>SAV client avec prise en charge totale ou partielle</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      case 'storage-usage':
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Espace de stockage</CardTitle>
                <CardDescription>
                  {storageLoading ? 'Chargement...' : `${(storageGB * 1024).toFixed(1)} MB utilisés sur ${STORAGE_LIMIT_GB * 1024} MB`}
                </CardDescription>
              </div>
              <HardDrive className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {!storageLoading && (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Utilisation</span>
                      <span>{storageUsagePercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          storageUsagePercent > 80 ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${storageUsagePercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={storageChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {storageChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          formatter={(value: any) => [`${(value).toFixed(3)} GB`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      // Widget sav-type-distribution supprimé
      // Widget monthly-profitability supprimé
      case 'annual-stats':
        return (
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Statistiques annuelles</CardTitle>
                <CardDescription>Évolution mensuelle pour l'année sélectionnée</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {monthlyLoading ? '...' : `${yearlyStats.totalRevenue.toFixed(2)} €`}
                  </div>
                  <p className="text-sm text-muted-foreground">CA Total {selectedYear}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {monthlyLoading ? '...' : `${yearlyStats.totalCosts.toFixed(2)} €`}
                  </div>
                  <p className="text-sm text-muted-foreground">Coûts Total {selectedYear}</p>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${monthlyLoading ? '' : yearlyStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {monthlyLoading ? '...' : `${yearlyStats.totalProfit.toFixed(2)} €`}
                  </div>
                  <p className="text-sm text-muted-foreground">Marge Total {selectedYear}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {monthlyLoading ? '...' : yearlyStats.totalSavs}
                  </div>
                  <p className="text-sm text-muted-foreground">SAV Total {selectedYear}</p>
                </div>
              </div>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => String(value)}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0]?.payload;
                          const monthNum = Number(data?.month);
                          let monthLabel = '';
                          if (monthNum && monthNum >= 1 && monthNum <= 12) {
                            try {
                              monthLabel = format(new Date(selectedYear, monthNum - 1), 'MMMM yyyy', { locale: fr });
                            } catch (error) {
                              monthLabel = '';
                            }
                          }
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-md min-w-[180px]">
                              <p className="font-bold text-sm mb-2 border-b pb-2 capitalize text-foreground">{monthLabel}</p>
                              <div className="space-y-1.5">
                                <p className="text-xs flex justify-between gap-3">
                                  <span className="text-muted-foreground">Nombre de SAV:</span>
                                  <span className="font-semibold">{data.savCount}</span>
                                </p>
                                <p className="text-xs flex justify-between gap-3">
                                  <span className="text-muted-foreground">Chiffre d'affaires:</span>
                                  <span className="font-semibold text-green-600">{data.revenue?.toFixed(2)} €</span>
                                </p>
                                <p className="text-xs flex justify-between gap-3">
                                  <span className="text-muted-foreground">Marge:</span>
                                  <span className="font-semibold text-blue-600">{data.profit?.toFixed(2)} €</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#22c55e" name="Chiffre d'affaires" />
                    <Bar yAxisId="left" dataKey="costs" fill="#ef4444" name="Coûts" />
                    <Line yAxisId="right" type="monotone" dataKey="savCount" stroke="#8884d8" strokeWidth={2} name="Nombre de SAV" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      
      // Widgets statistiques avancés
      case 'financial-overview':
        const financialData = defaultStatistics.profitabilityChart.map(item => ({
          date: item.date,
          revenue: item.revenue,
          expenses: item.expenses,
          profit: item.profit,
          margin: item.profit ? (item.profit / item.revenue) * 100 : 0,
          savCount: defaultStatistics.completedSavChart.find(c => c.date === item.date)?.completed || 0
        }));
        
        return (
          <Card className="md:col-span-2">
            <FinancialOverviewWidget 
              data={financialData}
              totalRevenue={defaultStatistics.revenue}
              totalExpenses={defaultStatistics.expenses}
              totalProfit={defaultStatistics.profit}
              averageMargin={defaultStatistics.profit ? (defaultStatistics.profit / defaultStatistics.revenue) * 100 : 0}
            />
          </Card>
        );

      case 'performance-trends':
        const performanceData = [
          { metric: 'Temps moyen', value: Math.min((defaultStatistics.savStats.averageTime / 48) * 100, 100), maxValue: 100, fullMark: 100 },
          { metric: 'Taux completion', value: 85, maxValue: 100, fullMark: 100 },
          { metric: 'Satisfaction', value: 92, maxValue: 100, fullMark: 100 },
          { metric: 'Efficacité', value: Math.max(100 - defaultStatistics.savStats.lateRate, 0), maxValue: 100, fullMark: 100 },
          { metric: 'Qualité', value: 88, maxValue: 100, fullMark: 100 }
        ];

        const statusData = [
          { name: 'En attente', value: defaultStatistics.savStats.total - Math.floor(defaultStatistics.savStats.total * 0.7), color: 'hsl(var(--warning))' },
          { name: 'En cours', value: Math.floor(defaultStatistics.savStats.total * 0.4), color: 'hsl(var(--info))' },
          { name: 'Prêt', value: Math.floor(defaultStatistics.savStats.total * 0.2), color: 'hsl(var(--success))' },
          { name: 'Livré', value: Math.floor(defaultStatistics.savStats.total * 0.1), color: 'hsl(var(--muted-foreground))' }
        ];
        
        return (
          <Card className="md:col-span-2">
            <SAVPerformanceWidget 
              performanceData={performanceData}
              statusData={statusData}
              totalSAV={defaultStatistics.savStats.total}
              averageTime={defaultStatistics.savStats.averageTime}
              completionRate={85}
              customerSatisfaction={92}
            />
          </Card>
        );

      case 'parts-usage-heatmap':
        const partsUsageData = defaultStatistics.topParts.map((part, index) => ({
          name: part.name,
          value: part.quantity,
          cost: part.quantity * 25,
          frequency: Math.max(10 - index, 1),
          trend: index < 2 ? 'up' as const : index > 5 ? 'down' as const : 'stable' as const,
          category: 'Écran'
        }));
        
        return (
          <Card className="md:col-span-2">
            <PartsUsageHeatmapWidget 
              partsData={partsUsageData}
              totalParts={defaultStatistics.topParts.reduce((sum, p) => sum + p.quantity, 0)}
              totalCost={defaultStatistics.expenses}
              topCategory="Écrans"
            />
          </Card>
        );

      // KPIs individuels avec DashboardWidgetContainer
      case 'kpi-revenue':
        return (
          <DashboardWidgetContainer widgetId="kpi-revenue">
            {(stats, periodLabel) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Chiffre d'affaires</CardTitle>
                  <CardDescription>{periodLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    onClick={() => navigate(`/stats/revenue?period=30d`)}
                    className="cursor-pointer hover:bg-accent/20 p-2 rounded transition-colors"
                  >
                    <p className="text-3xl font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.revenue)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </DashboardWidgetContainer>
        );

      case 'kpi-expenses':
        return (
          <DashboardWidgetContainer widgetId="kpi-expenses">
            {(stats, periodLabel) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dépenses</CardTitle>
                  <CardDescription>{periodLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    onClick={() => navigate(`/stats/expenses?period=30d`)}
                    className="cursor-pointer hover:bg-accent/20 p-2 rounded transition-colors"
                  >
                    <p className="text-3xl font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.expenses)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </DashboardWidgetContainer>
        );

      case 'kpi-profit':
        return (
          <DashboardWidgetContainer widgetId="kpi-profit">
            {(stats, periodLabel) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profit</CardTitle>
                  <CardDescription>{periodLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.profit)}</p>
                </CardContent>
              </Card>
            )}
          </DashboardWidgetContainer>
        );

      case 'kpi-takeover':
        return (
          <DashboardWidgetContainer widgetId="kpi-takeover">
            {(stats, periodLabel) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Prises en charge</CardTitle>
                  <CardDescription>{periodLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">Montant total</div>
                  <div className="text-2xl font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.takeoverStats.amount)}</div>
                  <div className="text-sm text-muted-foreground mt-1">Nombre de SAV</div>
                  <div className="text-lg">{stats.takeoverStats.count}</div>
                </CardContent>
              </Card>
            )}
          </DashboardWidgetContainer>
        );

      case 'sav-stats':
        return (
          <DashboardWidgetContainer widgetId="sav-stats">
            {(stats, periodLabel) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Temps moyen de traitement</CardTitle>
                  <CardDescription>{periodLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">
                    {stats.savStats.averageProcessingDays} jours
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Basé sur {stats.savStats.total} SAV terminés (statut "Prêt" ou "Annulé")
                  </div>
                </CardContent>
              </Card>
            )}
          </DashboardWidgetContainer>
        );

      case 'late-rate':
        return (
          <DashboardWidgetContainer widgetId="late-rate">
            {(stats, periodLabel) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Taux de retard</CardTitle>
                  <CardDescription>{periodLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">SAV en retard</div>
                  <div className="text-3xl font-semibold text-destructive">{stats.savStats.lateRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground mt-1">Basé sur les délais configurés</div>
                </CardContent>
              </Card>
            )}
          </DashboardWidgetContainer>
        );

      // Widget profitability-chart supprimé


      case 'top-parts-chart':
        return (
          <DashboardWidgetContainer widgetId="top-parts-chart">
            {(stats, periodLabel) => (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Top pièces utilisées</CardTitle>
                  <CardDescription>{periodLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ quantity: { label: "Quantité", color: "hsl(var(--primary))" } }}
                    className="h-72"
                  >
                    <BarChart data={stats.topParts}>
                      <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </DashboardWidgetContainer>
        );

      case 'late-rate-chart':
        return (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Évolution retards</CardTitle>
              <CardDescription>Taux de retard mensuel - {new Date().getFullYear()}</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyLateRateChart />
            </CardContent>
          </Card>
        );

      case 'top-devices':
        return (
          <DashboardWidgetContainer widgetId="top-devices">
            {(stats, periodLabel) => {
              const getPodiumIcon = (index: number) => {
                if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
                if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
                if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
                return <div className="w-6 h-6 flex items-center justify-center text-lg font-bold text-muted-foreground">{index + 1}</div>;
              };

              const getPodiumBg = (index: number) => {
                if (index === 0) return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200";
                if (index === 1) return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200";
                if (index === 2) return "bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200";
                return "bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200";
              };

              return (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Podium téléphones</CardTitle>
                    <CardDescription>{periodLabel}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.topDevices.slice(0, 10).map((device, index) => (
                        <div 
                          key={index}
                          className={`flex items-center gap-4 p-3 rounded-lg border-2 transition-all ${getPodiumBg(index)}`}
                        >
                          <div className="flex-shrink-0">
                            {getPodiumIcon(index)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{device.brand} {device.model}</div>
                            <div className="text-sm text-muted-foreground">{device.count} réparations</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            }}
          </DashboardWidgetContainer>
        );

      case 'monthly-comparison':
        // Utiliser les vraies données mensuelles de useMonthlyStatistics
        const monthNamesFr: Record<number, string> = {
          1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
          5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
          9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
        };
        
        // Prendre les données mensuelles jusqu'au mois actuel
        const currentMonthIndex = new Date().getMonth(); // 0-11
        const relevantMonthlyData = monthlyData.slice(0, currentMonthIndex + 1);
        
        const monthlyComparisonData = relevantMonthlyData.map((current, index) => {
          const previous = index > 0 ? relevantMonthlyData[index - 1] : null;
          const growth = previous?.revenue && previous.revenue > 0
            ? ((current.revenue - previous.revenue) / previous.revenue) * 100 
            : 0;
          
          return {
            month: current.month,
            monthName: monthNamesFr[current.month] || `Mois ${current.month}`,
            currentRevenue: current.revenue,
            previousRevenue: previous?.revenue || 0,
            currentSavCount: current.savCount,
            previousSavCount: previous?.savCount || 0,
            currentProfit: current.profit,
            previousProfit: previous?.profit || 0,
            growth
          };
        });
        
        // Croissance globale = moyenne des croissances mensuelles (excluant le premier mois sans référence)
        const growthValues = monthlyComparisonData.slice(1).map(m => m.growth);
        const calculatedTotalGrowth = growthValues.length > 0 
          ? growthValues.reduce((sum, g) => sum + g, 0) / growthValues.length
          : 0;
        
        // Trouver le meilleur mois (plus haute croissance) - exclure le premier mois
        const monthsWithGrowth = monthlyComparisonData.slice(1);
        const bestMonthData = monthsWithGrowth.length > 0 
          ? monthsWithGrowth.reduce((best, current) => current.growth > best.growth ? current : best, monthsWithGrowth[0])
          : null;
        const calculatedBestMonth = bestMonthData?.monthName || 'N/A';
        
        // Trouver le pire mois (plus basse croissance)
        const worstMonthData = monthsWithGrowth.length > 0 
          ? monthsWithGrowth.reduce((worst, current) => current.growth < worst.growth ? current : worst, monthsWithGrowth[0])
          : null;
        const calculatedWorstMonth = worstMonthData?.monthName || 'N/A';
        
        return (
          <Card className="md:col-span-2">
            <MonthlyComparisonWidget 
              data={monthlyComparisonData}
              totalGrowth={calculatedTotalGrowth}
              bestMonth={calculatedBestMonth}
              worstMonth={calculatedWorstMonth}
            />
          </Card>
        );

      case 'revenue-breakdown':
        return (
          <DashboardWidgetContainer widgetId="revenue-breakdown">
            {(stats, periodLabel) => {
              // Utiliser les vraies données de catégorisation des produits
              const revenueSources = stats.revenueByProductCategory.map(cat => ({
                name: cat.category,
                value: cat.revenue,
                percentage: cat.percentage,
                color: cat.color
              }));

              const serviceTypes = stats.revenueByProductCategory.map(cat => ({
                type: cat.category,
                revenue: cat.revenue,
                count: cat.count,
                averageValue: cat.count > 0 ? cat.revenue / cat.count : 0
              }));

              const topService = stats.revenueByProductCategory[0]?.category || 'N/A';
              
              return (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardDescription>{periodLabel} • Catégorisation intelligente basée sur les appareils</CardDescription>
                  </CardHeader>
                  <RevenueBreakdownWidget 
                    revenueSources={revenueSources}
                    serviceTypes={serviceTypes}
                    totalRevenue={stats.revenue}
                    topService={topService}
                  />
                </Card>
              );
            }}
          </DashboardWidgetContainer>
        );

      case 'customer-satisfaction':
        return (
          <Card className="md:col-span-2">
            <CustomerSatisfactionWidget 
              satisfactionData={satisfactionStats.monthlyData}
              satisfactionBreakdown={satisfactionStats.satisfactionBreakdown}
              averageRating={satisfactionStats.averageRating}
              totalReviews={satisfactionStats.totalReviews}
              responseRate={satisfactionStats.responseRate}
              trend={satisfactionStats.trend}
            />
          </Card>
        );

      default:
        // Gérer les widgets personnalisés
        const module = sortedModules.find(m => m.id === id);
        if (module?.isCustom) {
          return <CustomWidgetRenderer config={module} />;
        }
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold">
          Tableau de bord SAV - {new Date().toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric'
        }).charAt(0).toUpperCase() + new Date().toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric'
        }).slice(1)}
        </h2>
        <div className="flex gap-2">
          <Dialog open={isWidgetDialogOpen} onOpenChange={(open) => {
            if (!open) {
              refetch();
            }
            setIsWidgetDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Gestion widget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Gestion des Widgets</DialogTitle>
              </DialogHeader>
              <WidgetManager 
                onClose={() => setIsWidgetDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau SAV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un nouveau dossier SAV</DialogTitle>
              </DialogHeader>
              <SAVForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedModules.map(m => m.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-6 md:grid-cols-2">
            {sortedModules.map((m) => (
              <SortableBlock 
                key={m.id} 
                id={m.id}
                onRemove={() => handleRemoveWidget(m.id)}
              >
                {m.isCustom ? (
                  <CustomWidgetRenderer config={m} />
                ) : (
                  renderSection(m.id)
                )}
              </SortableBlock>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
