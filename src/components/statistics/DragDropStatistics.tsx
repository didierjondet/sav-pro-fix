import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { Medal, Trophy, Award } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useStatistics } from '@/hooks/useStatistics';
import { useStatisticsConfig, StatisticModule } from '@/hooks/useStatisticsConfig';
import { DraggableStatisticsWidget } from './DraggableStatisticsWidget';
import { WIDGET_SIZES, getWidgetClasses, DEFAULT_MODULE_SIZES } from './StatisticsWidgetSizes';

// Importation des widgets avancés
import { FinancialOverviewWidget } from './advanced/FinancialOverviewWidget';
import { SAVPerformanceWidget } from './advanced/SAVPerformanceWidget';
import { PartsUsageHeatmapWidget } from './advanced/PartsUsageHeatmapWidget';
import { MonthlyComparisonWidget } from './advanced/MonthlyComparisonWidget';
import { RevenueBreakdownWidget } from './advanced/RevenueBreakdownWidget';
import { CustomerSatisfactionWidget } from './advanced/CustomerSatisfactionWidget';

// Importation des widgets spécialisés
import { SAVTypesGridWidget } from './widgets/SAVTypesGridWidget';
import { FinanceKPIsWidget } from './widgets/FinanceKPIsWidget';
import { StorageUsageWidget } from './widgets/StorageUsageWidget';
import { SAVTypeDistributionWidget } from './widgets/SAVTypeDistributionWidget';
import { MonthlyProfitabilityWidget } from './widgets/MonthlyProfitabilityWidget';
import { AnnualStatsWidget } from './widgets/AnnualStatsWidget';
import { CustomWidgetRenderer } from './CustomWidgetRenderer';

interface DragDropStatisticsProps {
  period: '7d' | '30d' | '3m' | '6m' | '1y';
  onPeriodChange: (period: '7d' | '30d' | '3m' | '6m' | '1y') => void;
}

export const DragDropStatistics = ({ period, onPeriodChange }: DragDropStatisticsProps) => {
  const navigate = useNavigate();
  const { modules, reorderModules } = useStatisticsConfig();
  const [sortedModules, setSortedModules] = useState<StatisticModule[]>([]);
  
  const {
    revenue,
    expenses,
    profit,
    savStats,
    takeoverStats,
    profitabilityChart,
    completedSavChart,
    topParts,
    topDevices,
    lateRateChart,
    loading
  } = useStatistics(period);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const enabledModules = modules.filter(m => m.enabled).sort((a, b) => a.order - b.order);
    console.log('📊 Enabled modules:', enabledModules);
    console.log('🎨 Custom widgets:', enabledModules.filter(m => m.isCustom));
    setSortedModules(enabledModules);
  }, [modules]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedModules.findIndex(m => m.id === active.id);
      const newIndex = sortedModules.findIndex(m => m.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedModules, oldIndex, newIndex);
        setSortedModules(newOrder);
        
        // Mettre à jour l'ordre dans la configuration complète
        const updatedModules = modules.map(module => {
          const newOrderItem = newOrder.find(no => no.id === module.id);
          if (newOrderItem) {
            return { ...module, order: newOrder.indexOf(newOrderItem) };
          }
          return module;
        });
        
        reorderModules(updatedModules);
      }
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

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

  const renderWidget = (module: StatisticModule) => {
    // Définir baseProps pour tous les widgets (standards et personnalisés)
    const baseProps = {
      id: module.id,
      title: module.name,
      isEnabled: module.enabled
    };

    // Gérer les widgets personnalisés créés par l'IA
    if (module.isCustom) {
      const size = DEFAULT_MODULE_SIZES[module.id] || 'medium';
      const className = getWidgetClasses(size);
      
      return (
        <div className={className}>
          <DraggableStatisticsWidget {...baseProps}>
            <CustomWidgetRenderer config={module} />
          </DraggableStatisticsWidget>
        </div>
      );
    }

    const size = DEFAULT_MODULE_SIZES[module.id] || 'small';
    const className = getWidgetClasses(size);

    switch (module.id) {
      // Widgets avancés combinés
      case 'financial-overview':
        const financialData = profitabilityChart.map(item => ({
          date: item.date,
          revenue: item.revenue,
          expenses: item.expenses,
          profit: item.profit,
          margin: item.profit ? (item.profit / item.revenue) * 100 : 0,
          savCount: completedSavChart.find(c => c.date === item.date)?.completed || 0
        }));
        
        return (
          <div className={className}>
            <FinancialOverviewWidget 
              data={financialData}
              totalRevenue={revenue}
              totalExpenses={expenses}
              totalProfit={profit}
              averageMargin={profit ? (profit / revenue) * 100 : 0}
            />
          </div>
        );

      case 'performance-trends':
        const performanceData = [
          { metric: 'Temps moyen', value: Math.min((savStats.averageTime / 48) * 100, 100), maxValue: 100, fullMark: 100 },
          { metric: 'Taux completion', value: 85, maxValue: 100, fullMark: 100 },
          { metric: 'Satisfaction', value: 92, maxValue: 100, fullMark: 100 },
          { metric: 'Efficacité', value: Math.max(100 - savStats.lateRate, 0), maxValue: 100, fullMark: 100 },
          { metric: 'Qualité', value: 88, maxValue: 100, fullMark: 100 }
        ];

        const statusData = [
          { name: 'En attente', value: savStats.total - Math.floor(savStats.total * 0.7), color: 'hsl(var(--warning))' },
          { name: 'En cours', value: Math.floor(savStats.total * 0.4), color: 'hsl(var(--info))' },
          { name: 'Prêt', value: Math.floor(savStats.total * 0.2), color: 'hsl(var(--success))' },
          { name: 'Livré', value: Math.floor(savStats.total * 0.1), color: 'hsl(var(--muted-foreground))' }
        ];
        
        return (
          <div className={className}>
            <SAVPerformanceWidget 
              performanceData={performanceData}
              statusData={statusData}
              totalSAV={savStats.total}
              averageTime={savStats.averageTime}
              completionRate={85}
              customerSatisfaction={92}
            />
          </div>
        );

      case 'parts-usage-heatmap':
        const partsUsageData = topParts.map((part, index) => ({
          name: part.name,
          value: part.quantity,
          cost: part.quantity * 25, // Prix estimé
          frequency: Math.max(10 - index, 1),
          trend: index < 2 ? 'up' as const : index > 5 ? 'down' as const : 'stable' as const,
          category: 'Écran'
        }));
        
        return (
          <div className={className}>
            <PartsUsageHeatmapWidget 
              partsData={partsUsageData}
              totalParts={topParts.reduce((sum, p) => sum + p.quantity, 0)}
              totalCost={expenses}
              topCategory="Écrans"
            />
          </div>
        );

      case 'monthly-comparison':
        const monthlyData = profitabilityChart.slice(-6).map((current, index) => {
          const previous = profitabilityChart[profitabilityChart.length - 6 + index - 1] || current;
          const growth = previous.revenue ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0;
          
          return {
            month: current.date,
            currentRevenue: current.revenue,
            previousRevenue: previous.revenue,
            currentSavCount: completedSavChart.find(c => c.date === current.date)?.completed || 0,
            previousSavCount: completedSavChart.find(c => c.date === previous.date)?.completed || 0,
            currentProfit: current.profit,
            previousProfit: previous.profit,
            growth
          };
        });
        
        return (
          <div className={className}>
            <MonthlyComparisonWidget 
              data={monthlyData}
              totalGrowth={15.2}
              bestMonth="Mars"
              worstMonth="Janvier"
            />
          </div>
        );

      case 'revenue-breakdown':
        const revenueSources = [
          { name: 'Réparations', value: revenue * 0.6, percentage: 60, color: 'hsl(var(--primary))' },
          { name: 'Remplacements', value: revenue * 0.25, percentage: 25, color: 'hsl(var(--success))' },
          { name: 'Diagnostics', value: revenue * 0.15, percentage: 15, color: 'hsl(var(--warning))' }
        ];

        const serviceTypes = [
          { type: 'Réparation', revenue: revenue * 0.6, count: Math.floor(savStats.total * 0.6), averageValue: (revenue * 0.6) / Math.floor(savStats.total * 0.6) },
          { type: 'Remplacement', revenue: revenue * 0.25, count: Math.floor(savStats.total * 0.25), averageValue: (revenue * 0.25) / Math.floor(savStats.total * 0.25) },
          { type: 'Diagnostic', revenue: revenue * 0.15, count: Math.floor(savStats.total * 0.15), averageValue: (revenue * 0.15) / Math.floor(savStats.total * 0.15) }
        ];
        
        return (
          <div className={className}>
            <RevenueBreakdownWidget 
              revenueSources={revenueSources}
              serviceTypes={serviceTypes}
              totalRevenue={revenue}
              topService="Réparation d'écran"
            />
          </div>
        );

      // KPIs simples existants
      case 'kpi-revenue':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <div 
                onClick={() => navigate(`/stats/revenue?period=${period}`)}
                className="cursor-pointer hover:bg-accent/20 p-2 rounded transition-colors"
              >
                <p className="text-3xl font-semibold">{formatCurrency(revenue)}</p>
              </div>
            </DraggableStatisticsWidget>
          </div>
        );

      case 'kpi-expenses':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <div 
                onClick={() => navigate(`/stats/expenses?period=${period}`)}
                className="cursor-pointer hover:bg-accent/20 p-2 rounded transition-colors"
              >
                <p className="text-3xl font-semibold">{formatCurrency(expenses)}</p>
              </div>
            </DraggableStatisticsWidget>
          </div>
        );

      case 'kpi-profit':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <p className="text-3xl font-semibold">{formatCurrency(profit)}</p>
            </DraggableStatisticsWidget>
          </div>
        );

      case 'kpi-takeover':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <div className="text-sm text-muted-foreground">Montant total</div>
              <div className="text-2xl font-semibold">{formatCurrency(takeoverStats.amount)}</div>
              <div className="text-sm text-muted-foreground mt-1">Nombre de SAV</div>
              <div className="text-lg">{takeoverStats.count}</div>
            </DraggableStatisticsWidget>
          </div>
        );

      case 'sav-stats':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <div className="text-sm text-muted-foreground">Total SAV</div>
              <div className="text-2xl font-semibold">{savStats.total}</div>
              <div className="text-sm text-muted-foreground mt-1">Temps moyen</div>
              <div className="text-lg">{savStats.averageTime} h</div>
            </DraggableStatisticsWidget>
          </div>
        );

      case 'late-rate':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <div className="text-sm text-muted-foreground">SAV en retard</div>
              <div className="text-3xl font-semibold text-destructive">{savStats.lateRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground mt-1">Basé sur les délais configurés</div>
            </DraggableStatisticsWidget>
          </div>
        );

      // Graphiques existants
      case 'profitability-chart':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <ChartContainer
                config={{
                  revenue: { label: "Revenus", color: "hsl(var(--primary))" },
                  expenses: { label: "Dépenses", color: "hsl(var(--muted-foreground))" },
                  profit: { label: "Profit", color: "hsl(var(--secondary))" }
                }}
                className="h-72"
              >
                <LineChart data={profitabilityChart}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `${v/1000}k`} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </DraggableStatisticsWidget>
          </div>
        );

      case 'completed-sav-chart':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <ChartContainer
                config={{ completed: { label: "SAV terminés", color: "hsl(var(--secondary))" } }}
                className="h-72"
              >
                <BarChart data={completedSavChart}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
                </BarChart>
              </ChartContainer>
            </DraggableStatisticsWidget>
          </div>
        );

      case 'top-parts-chart':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <ChartContainer
                config={{ quantity: { label: "Quantité", color: "hsl(var(--primary))" } }}
                className="h-72"
              >
                <BarChart data={topParts}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
                </BarChart>
              </ChartContainer>
            </DraggableStatisticsWidget>
          </div>
        );

      case 'late-rate-chart':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <ChartContainer
                config={{ lateRate: { label: "Taux de retard (%)", color: "hsl(var(--destructive))" } }}
                className="h-72"
              >
                <LineChart data={lateRateChart}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="lateRate" stroke="var(--color-lateRate)" strokeWidth={2} dot={true} />
                </LineChart>
              </ChartContainer>
            </DraggableStatisticsWidget>
          </div>
        );

      case 'top-devices':
        return (
          <div className={className}>
            <DraggableStatisticsWidget {...baseProps}>
              <div className="space-y-3">
                {topDevices.slice(0, 5).map((device, index) => (
                  <div 
                    key={`${device.brand}-${device.model}`}
                    className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getPodiumBg(index)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getPodiumIcon(index)}
                        <div>
                          <div className="font-semibold text-foreground">
                            {device.brand}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {device.model}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          {device.count}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          réparations
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {topDevices.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune donnée de téléphone disponible</p>
                    <p className="text-sm">Les données apparaîtront quand des SAV avec marque/modèle seront créés</p>
                  </div>
                )}
              </div>
            </DraggableStatisticsWidget>
          </div>
        );

      case 'customer-satisfaction':
        return (
          <div className={className}>
            <CustomerSatisfactionWidget 
              satisfactionData={[
                { period: 'Jan', rating: 4.2, reviews: 45, response_rate: 92 },
                { period: 'Fév', rating: 4.4, reviews: 52, response_rate: 94 },
                { period: 'Mar', rating: 4.3, reviews: 38, response_rate: 88 },
                { period: 'Avr', rating: 4.6, reviews: 61, response_rate: 96 },
                { period: 'Mai', rating: 4.5, reviews: 47, response_rate: 91 },
                { period: 'Juin', rating: 4.7, reviews: 55, response_rate: 98 }
              ]}
              satisfactionBreakdown={[
                { stars: 5, count: 156, percentage: 65, color: '#10b981' },
                { stars: 4, count: 72, percentage: 30, color: '#3b82f6' },
                { stars: 3, count: 8, percentage: 3, color: '#f59e0b' },
                { stars: 2, count: 3, percentage: 1, color: '#ef4444' },
                { stars: 1, count: 1, percentage: 1, color: '#dc2626' }
              ]}
              averageRating={4.5}
              totalReviews={240}
              responseRate={94}
              trend="up"
            />
          </div>
        );

      // Nouveaux widgets spécialisés
      case 'sav-types-grid':
        const savTypesData = [
          { id: 'smartphone', name: 'Smartphone', count: Math.floor(savStats.total * 0.4), averageTime: 24, trend: 'up' as const, color: 'hsl(var(--primary))', icon: 'smartphone' },
          { id: 'tablet', name: 'Tablette', count: Math.floor(savStats.total * 0.2), averageTime: 48, trend: 'stable' as const, color: 'hsl(var(--secondary))', icon: 'tablet' },
          { id: 'laptop', name: 'Ordinateur', count: Math.floor(savStats.total * 0.15), averageTime: 72, trend: 'down' as const, color: 'hsl(var(--success))', icon: 'laptop' },
          { id: 'watch', name: 'Montre', count: Math.floor(savStats.total * 0.1), averageTime: 12, trend: 'up' as const, color: 'hsl(var(--warning))', icon: 'watch' },
          { id: 'headphones', name: 'Écouteurs', count: Math.floor(savStats.total * 0.1), averageTime: 6, trend: 'stable' as const, color: 'hsl(var(--accent))', icon: 'headphones' },
          { id: 'camera', name: 'Appareil photo', count: Math.floor(savStats.total * 0.05), averageTime: 96, trend: 'down' as const, color: 'hsl(var(--muted-foreground))', icon: 'camera' }
        ];
        
        return (
          <div className={className}>
            <SAVTypesGridWidget 
              savTypes={savTypesData}
              totalSAV={savStats.total}
              onCreateNewSAV={(typeId) => navigate('/sav/new')}
            />
          </div>
        );

      case 'finance-kpis':
        const currentMonthFinance = {
          revenue,
          expenses,
          profit,
          margin: profit ? (profit / revenue) * 100 : 0,
          takeoverAmount: takeoverStats.amount,
          takeoverCount: takeoverStats.count,
          growth: 15.2,
          target: revenue * 1.2
        };
        
        const previousMonthFinance = {
          revenue: revenue * 0.85,
          expenses: expenses * 0.9,
          profit: profit * 0.8,
          margin: 42,
          takeoverAmount: takeoverStats.amount * 0.7,
          takeoverCount: takeoverStats.count - 5,
          growth: -5.3,
          target: revenue * 1.15
        };
        
        return (
          <div className={className}>
            <FinanceKPIsWidget 
              currentMonth={currentMonthFinance}
              previousMonth={previousMonthFinance}
              yearTarget={revenue * 12}
              monthProgress={75}
            />
          </div>
        );

      case 'storage-usage':
        const storageCategories = [
          { name: 'Photos SAV', size: 2.1 * 1024 * 1024 * 1024, count: 1205, color: 'hsl(var(--primary))', icon: 'image', percentage: 42 },
          { name: 'Documents', size: 890 * 1024 * 1024, count: 340, color: 'hsl(var(--secondary))', icon: 'document', percentage: 18 },
          { name: 'Sauvegardes', size: 1.5 * 1024 * 1024 * 1024, count: 12, color: 'hsl(var(--success))', icon: 'archive', percentage: 30 },
          { name: 'Téléchargements', size: 450 * 1024 * 1024, count: 89, color: 'hsl(var(--warning))', icon: 'download', percentage: 10 }
        ];
        
        return (
          <div className={className}>
            <StorageUsageWidget 
              totalUsed={4.94 * 1024 * 1024 * 1024}
              totalLimit={10 * 1024 * 1024 * 1024}
              categories={storageCategories}
              onManageStorage={() => navigate('/settings?tab=storage')}
              onCleanup={() => console.log('Nettoyage du stockage')}
            />
          </div>
        );

      case 'sav-type-distribution':
        const serviceTypesDistribution = [
          { type: 'Réparation d\'écran', count: Math.floor(savStats.total * 0.35), percentage: 35, averageRevenue: 120, averageTime: 24, color: 'hsl(var(--primary))', trend: 'up' as const },
          { type: 'Remplacement batterie', count: Math.floor(savStats.total * 0.25), percentage: 25, averageRevenue: 80, averageTime: 12, color: 'hsl(var(--secondary))', trend: 'stable' as const },
          { type: 'Réparation connecteur', count: Math.floor(savStats.total * 0.15), percentage: 15, averageRevenue: 60, averageTime: 18, color: 'hsl(var(--success))', trend: 'up' as const },
          { type: 'Diagnostic', count: Math.floor(savStats.total * 0.15), percentage: 15, averageRevenue: 35, averageTime: 6, color: 'hsl(var(--warning))', trend: 'stable' as const },
          { type: 'Réparation carte mère', count: Math.floor(savStats.total * 0.1), percentage: 10, averageRevenue: 200, averageTime: 48, color: 'hsl(var(--destructive))', trend: 'down' as const }
        ];
        
        return (
          <div className={className}>
            <SAVTypeDistributionWidget 
              serviceTypes={serviceTypesDistribution}
              totalSAV={savStats.total}
              totalRevenue={revenue}
              dominantType="Écrans"
            />
          </div>
        );

      case 'monthly-profitability':
        const profitabilityMonthlyData = profitabilityChart.slice(-6).map((item, index) => ({
          month: item.date,
          revenue: item.revenue,
          expenses: item.expenses,
          profit: item.profit,
          margin: item.profit ? (item.profit / item.revenue) * 100 : 0,
          target: item.revenue * 1.1,
          marginTarget: 50
        }));
        
        return (
          <div className={className}>
            <MonthlyProfitabilityWidget 
              data={profitabilityMonthlyData}
              averageMargin={profit ? (profit / revenue) * 100 : 0}
              bestMonth="Avril"
              worstMonth="Janvier"
              targetAchieved={profit > revenue * 0.5}
              monthsAboveTarget={4}
            />
          </div>
        );

      case 'annual-stats':
        const annualMonthlyData = profitabilityChart.map((item, index) => ({
          month: item.date,
          revenue: item.revenue,
          savCount: completedSavChart.find(c => c.date === item.date)?.completed || 0,
          averageTime: savStats.averageTime + (Math.random() - 0.5) * 10,
          customerSatisfaction: 85 + Math.random() * 15,
          partsUsed: Math.floor(Math.random() * 50) + 20,
          efficiency: Math.max(60, Math.min(95, 80 + (Math.random() - 0.5) * 20))
        }));
        
        return (
          <div className={className}>
            <AnnualStatsWidget 
              monthlyData={annualMonthlyData}
              currentYear={2024}
              totalRevenue={revenue * 12}
              totalSAV={savStats.total * 12}
              averageEfficiency={82}
              yearOverYearGrowth={15.3}
              bestPerformanceMonth="Juin"
              worstPerformanceMonth="Février"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Statistiques SAV</h1>
        <div className="w-full sm:w-56">
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger aria-label="Période">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="3m">3 mois</SelectItem>
              <SelectItem value="6m">6 mois</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DnD Context for reorderable widgets */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedModules.map(m => m.id)} strategy={rectSortingStrategy}>
          {/* Grille CSS adaptative pour différentes tailles de widgets */}
          <div className="grid grid-cols-4 auto-rows-[140px] gap-4 w-full">
            {sortedModules.map((module) => renderWidget(module))}
          </div>
        </SortableContext>
      </DndContext>

      {sortedModules.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">Aucun module activé</p>
            <p className="text-sm">
              Activez des modules dans les paramètres d'apparence pour voir vos statistiques ici.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};