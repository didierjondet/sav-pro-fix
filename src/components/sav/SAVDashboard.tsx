import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, HardDrive, Calendar, Info, GripVertical } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SAVForm } from './SAVForm';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShop } from '@/hooks/useShop';
import { useSAVPartsCosts } from '@/hooks/useSAVPartsCosts';
import { useShopStorageUsage } from '@/hooks/useStorageUsage';
import { useMonthlyStatistics } from '@/hooks/useMonthlyStatistics';
import { calculateSAVDelay } from '@/hooks/useSAVDelay';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { format, differenceInHours } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { DraggableStatisticsWidget } from '@/components/statistics/DraggableStatisticsWidget';
import { useStatisticsConfig, StatisticModule } from '@/hooks/useStatisticsConfig';
import { SortableBlock } from '@/components/statistics/SortableBlock';

// Limite de stockage par magasin (500 MB = 0.5 GB)
const STORAGE_LIMIT_GB = 0.5;

export function SAVDashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { cases, loading } = useSAVCases();
  const { shop } = useShop();
  const { costs, loading: costsLoading } = useSAVPartsCosts();
  const { storageGB, loading: storageLoading } = useShopStorageUsage(shop?.id);
  const { data: monthlyData, loading: monthlyLoading } = useMonthlyStatistics(selectedYear);
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();
  const navigate = useNavigate();

  // Drag & Drop config shared
  const { modules, reorderModules } = useStatisticsConfig();
  const dashboardModuleIds = [
    'sav-types-grid',
    'finance-kpis',
    'storage-usage',
    'sav-type-distribution',
    'monthly-profitability',
    'annual-stats'
  ];
  const [sortedModules, setSortedModules] = useState<StatisticModule[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const enabled = modules
      .filter(m => m.enabled && dashboardModuleIds.includes(m.id))
      .sort((a, b) => a.order - b.order);
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

    // Conserver l'ordre global des autres modules et mettre à jour seulement ceux du dashboard
    const others = modules.filter(m => !dashboardModuleIds.includes(m.id)).sort((a,b) => a.order - b.order);
    const merged = [...others, ...newOrder];
    reorderModules(merged);
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
      case 'sav-types-grid':
        return (
          <Card>
            <CardHeader className="pb-3 px-4">
              <CardTitle className="text-lg font-semibold text-primary">Types de SAV - Répartition</CardTitle>
              <CardDescription>Cliquez sur un type pour voir la liste des SAV correspondants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {getAllTypes().map((type) => {
                  const count = cases.filter(c => c.sav_type === type.value && !isReadyStatus(c.status)).length;
                  const tooltipInfo = getSAVTypeTooltipInfo(type.value);
                  
                  return (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Card 
                          className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border-l-4"
                          style={{ 
                            borderLeftColor: type.color,
                            backgroundColor: `${type.color}15` // 15 = environ 8% d'opacité
                          }}
                          onClick={() => navigateToFilteredSAV(type.value)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: type.color }}
                                />
                                <span className="text-sm font-medium">{type.label}</span>
                              </div>
                              <span className="text-lg font-bold text-primary">{count}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </HoverCardTrigger>
                      <HoverCardContent side="bottom" className="max-w-sm p-3">
                        <div className="space-y-2">
                          <p className="font-medium">{tooltipInfo.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {tooltipInfo.count} SAV actifs (hors "prêts")
                          </p>
                          {tooltipInfo.cases && tooltipInfo.cases.length > 0 && (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              <p className="text-xs font-medium text-muted-foreground">SAV concernés :</p>
                              {tooltipInfo.cases.map((savCase) => (
                                <button
                                  key={savCase.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/sav/${savCase.id}`);
                                  }}
                                  className="block w-full text-left text-xs p-1 rounded hover:bg-muted/50 transition-colors"
                                >
                                  <span className="font-medium">
                                    {savCase.customer ? `${savCase.customer.last_name} ${savCase.customer.first_name}` : `#${savCase.case_number}`}
                                  </span>
                                  <div className="text-muted-foreground">
                                    {savCase.device_brand} {savCase.device_model}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
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
      case 'sav-type-distribution':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Répartition des SAV</CardTitle>
              <CardDescription>Par type de service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={savDistributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {savDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      case 'monthly-profitability':
        return (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Rentabilité mensuelle</CardTitle>
              <CardDescription>Chiffre d'affaires vs Coûts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitabilityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip formatter={(value) => [`${Number(value).toFixed(2)} €`, '']} />
                    <Legend />
                    <Bar dataKey="Chiffre d'affaires" fill="#22c55e" name="Chiffre d'affaires" />
                    <Bar dataKey="Coûts" fill="#ef4444" name="Coûts" />
                    <Bar dataKey="Marge" fill="#3b82f6" name="Marge" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
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
                      tickFormatter={(value) => {
                        const monthNum = Number(value);
                        if (!monthNum || monthNum < 1 || monthNum > 12) return '';
                        try {
                          return format(new Date(selectedYear, monthNum - 1), 'MMM');
                        } catch (error) {
                          return '';
                        }
                      }}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip 
                      labelFormatter={(value) => {
                        const monthNum = Number(value);
                        if (!monthNum || monthNum < 1 || monthNum > 12) return '';
                        try {
                          return format(new Date(selectedYear, monthNum - 1), 'MMMM yyyy');
                        } catch (error) {
                          return '';
                        }
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === 'Nombre de SAV') {
                          return [value, name];
                        }
                        return [`${Number(value).toFixed(2)} €`, name];
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
      default:
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedModules.map(m => m.id)} strategy={rectSortingStrategy}>
          <div className="grid gap-6 md:grid-cols-2">
            {sortedModules.map((m) => (
              <SortableBlock key={m.id} id={m.id}>
                {renderSection(m.id)}
              </SortableBlock>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
