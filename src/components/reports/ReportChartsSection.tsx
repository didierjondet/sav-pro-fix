import { useMemo } from 'react';
import { MonthlyComparisonWidget } from '@/components/statistics/advanced/MonthlyComparisonWidget';
import { FinancialOverviewWidget } from '@/components/statistics/advanced/FinancialOverviewWidget';
import { SAVPerformanceWidget } from '@/components/statistics/advanced/SAVPerformanceWidget';
import { RevenueBreakdownWidget } from '@/components/statistics/advanced/RevenueBreakdownWidget';
import { PartsUsageHeatmapWidget } from '@/components/statistics/advanced/PartsUsageHeatmapWidget';
import { CustomerSatisfactionWidget } from '@/components/statistics/advanced/CustomerSatisfactionWidget';
import { AnnualStatsWidget } from '@/components/statistics/widgets/AnnualStatsWidget';
import { FinanceKPIsWidget } from '@/components/statistics/widgets/FinanceKPIsWidget';
import { QuoteRejectionWidget } from '@/components/statistics/widgets/QuoteRejectionWidget';
import { MonthlyLateRateChart } from '@/components/statistics/widgets/MonthlyLateRateChart';
import { useMonthlyStatistics } from '@/hooks/useMonthlyStatistics';
import { useStatistics } from '@/hooks/useStatistics';
import { Loader2 } from 'lucide-react';

// Liste des widgets disponibles pour les rapports
export const AVAILABLE_REPORT_WIDGETS = [
  { id: 'monthly-comparison', name: 'Comparaison mensuelle', description: 'Comparatif mois par mois' },
  { id: 'financial-overview', name: 'Vue d\'ensemble financière', description: 'Graphique combiné des finances' },
  { id: 'performance-trends', name: 'Performance SAV', description: 'Analyse des performances' },
  { id: 'annual-stats', name: 'Statistiques annuelles', description: 'Évolution mensuelle' },
  { id: 'finance-kpis', name: 'KPIs financiers', description: 'Indicateurs du mois' },
  { id: 'quote-rejections', name: 'Raisons de refus devis', description: 'Analyse des devis refusés' },
  { id: 'late-rate-chart', name: 'Évolution des retards', description: 'Tendance du taux de retard' },
  { id: 'revenue-breakdown', name: 'Répartition du CA', description: 'Analyse détaillée des revenus' },
  { id: 'parts-usage-heatmap', name: 'Utilisation des pièces', description: 'Analyse d\'usage des pièces' },
  { id: 'customer-satisfaction', name: 'Satisfaction client', description: 'Indicateurs de satisfaction' },
];

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

interface ReportChartsSectionProps {
  selectedWidgets: string[];
  dateRange: { start: Date; end: Date };
}

export function ReportChartsSection({ selectedWidgets, dateRange }: ReportChartsSectionProps) {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  
  const { data: currentYearData, loading: loadingCurrent } = useMonthlyStatistics(currentYear);
  const { data: previousYearData, loading: loadingPrevious } = useMonthlyStatistics(previousYear);
  const statistics = useStatistics('30d');
  const loadingStats = statistics.loading;

  // Prepare monthly comparison data
  const monthlyComparisonData = useMemo(() => {
    if (!currentYearData.length || !previousYearData.length) return [];
    
    return currentYearData.map((current, index) => {
      const previous = previousYearData[index];
      const growth = previous?.revenue > 0 
        ? ((current.revenue - previous.revenue) / previous.revenue) * 100 
        : 0;
      
      return {
        month: current.month,
        monthName: MONTHS_FR[index],
        currentRevenue: current.revenue,
        previousRevenue: previous?.revenue || 0,
        currentSavCount: current.savCount,
        previousSavCount: previous?.savCount || 0,
        currentProfit: current.profit,
        previousProfit: previous?.profit || 0,
        growth
      };
    });
  }, [currentYearData, previousYearData]);

  const totalGrowth = useMemo(() => {
    const currentTotal = currentYearData.reduce((sum, m) => sum + m.revenue, 0);
    const previousTotal = previousYearData.reduce((sum, m) => sum + m.revenue, 0);
    return previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
  }, [currentYearData, previousYearData]);

  const bestMonth = useMemo(() => {
    if (!monthlyComparisonData.length) return '-';
    const best = monthlyComparisonData.reduce((a, b) => a.currentRevenue > b.currentRevenue ? a : b);
    return best.monthName;
  }, [monthlyComparisonData]);

  const worstMonth = useMemo(() => {
    if (!monthlyComparisonData.length) return '-';
    const worst = monthlyComparisonData.reduce((a, b) => a.currentRevenue < b.currentRevenue ? a : b);
    return worst.monthName;
  }, [monthlyComparisonData]);

  // Prepare financial overview data
  const financialData = useMemo(() => {
    return currentYearData.map(m => ({
      date: MONTHS_FR[m.month - 1].slice(0, 3),
      revenue: m.revenue,
      expenses: m.costs,
      profit: m.profit,
      margin: m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0,
      savCount: m.savCount
    }));
  }, [currentYearData]);

  const totalRevenue = currentYearData.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = currentYearData.reduce((sum, m) => sum + m.costs, 0);
  const totalProfit = currentYearData.reduce((sum, m) => sum + m.profit, 0);
  const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const totalSAV = currentYearData.reduce((sum, m) => sum + m.savCount, 0);

  // Prepare SAV performance data
  const performanceData = useMemo(() => {
    if (!statistics) return [];
    const avgTime = statistics.savStats?.averageTime || 0;
    const lateRate = statistics.savStats?.lateRate || 0;
    const total = statistics.savStats?.total || 0;
    
    return [
      { metric: 'Rapidité', value: Math.min(100, 100 - (avgTime / 24) * 10), maxValue: 100, fullMark: 100 },
      { metric: 'Ponctualité', value: Math.max(0, 100 - lateRate), maxValue: 100, fullMark: 100 },
      { metric: 'Volume', value: Math.min(100, total > 0 ? 80 : 0), maxValue: 100, fullMark: 100 },
      { metric: 'Rentabilité', value: Math.min(100, Math.max(0, averageMargin * 2)), maxValue: 100, fullMark: 100 },
      { metric: 'Satisfaction', value: 85, maxValue: 100, fullMark: 100 }
    ];
  }, [statistics, averageMargin]);

  const statusData = useMemo(() => {
    if (!statistics) return [];
    const distribution = statistics.savStatusDistribution || [];
    return distribution.map((item: { name: string; value: number }) => ({
      name: item.name,
      value: item.value,
      color: item.name === 'ready' ? 'hsl(var(--success))' : 
             item.name === 'delivered' ? 'hsl(var(--muted-foreground))' : 
             item.name === 'pending' ? 'hsl(var(--warning))' : 'hsl(var(--info))'
    }));
  }, [statistics]);

  // Annual stats data
  const annualStatsData = useMemo(() => {
    return currentYearData.map(m => ({
      month: MONTHS_FR[m.month - 1].slice(0, 3),
      revenue: m.revenue,
      savCount: m.savCount,
      averageTime: 0,
      customerSatisfaction: 85,
      partsUsed: 0,
      efficiency: 80,
      profit: m.profit
    }));
  }, [currentYearData]);

  // Finance KPIs data
  const currentMonthData = useMemo(() => {
    const currentMonthIndex = new Date().getMonth();
    const data = currentYearData[currentMonthIndex] || { revenue: 0, costs: 0, profit: 0, savCount: 0 };
    const prevData = currentYearData[currentMonthIndex - 1] || { revenue: 0, costs: 0, profit: 0, savCount: 0 };
    const growth = prevData.revenue > 0 ? ((data.revenue - prevData.revenue) / prevData.revenue) * 100 : 0;
    
    return {
      revenue: data.revenue,
      expenses: data.costs,
      profit: data.profit,
      margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      takeoverAmount: 0,
      takeoverCount: 0,
      growth,
      target: data.revenue * 1.1
    };
  }, [currentYearData]);

  const previousMonthData = useMemo(() => {
    const currentMonthIndex = new Date().getMonth();
    const data = currentYearData[currentMonthIndex - 1] || { revenue: 0, costs: 0, profit: 0, savCount: 0 };
    const prevData = currentYearData[currentMonthIndex - 2] || { revenue: 0, costs: 0, profit: 0, savCount: 0 };
    const growth = prevData.revenue > 0 ? ((data.revenue - prevData.revenue) / prevData.revenue) * 100 : 0;
    
    return {
      revenue: data.revenue,
      expenses: data.costs,
      profit: data.profit,
      margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      takeoverAmount: 0,
      takeoverCount: 0,
      growth,
      target: data.revenue * 1.1
    };
  }, [currentYearData]);

  // Revenue breakdown data
  const revenueSources = useMemo(() => {
    const total = totalRevenue || 1;
    return [
      { name: 'Réparations', value: total * 0.6, percentage: 60, color: 'hsl(var(--primary))' },
      { name: 'Pièces', value: total * 0.25, percentage: 25, color: 'hsl(var(--chart-2))' },
      { name: 'Services', value: total * 0.15, percentage: 15, color: 'hsl(var(--chart-3))' },
    ];
  }, [totalRevenue]);

  const serviceTypes = useMemo(() => [
    { type: 'Écran', revenue: totalRevenue * 0.4, count: Math.floor(totalSAV * 0.4), averageValue: 89 },
    { type: 'Batterie', revenue: totalRevenue * 0.3, count: Math.floor(totalSAV * 0.3), averageValue: 45 },
    { type: 'Connecteur', revenue: totalRevenue * 0.2, count: Math.floor(totalSAV * 0.2), averageValue: 35 },
    { type: 'Autres', revenue: totalRevenue * 0.1, count: Math.floor(totalSAV * 0.1), averageValue: 55 },
  ], [totalRevenue, totalSAV]);

  // Parts usage data
  const partsData = useMemo(() => [
    { name: 'Écran iPhone', value: 45, cost: totalExpenses * 0.3, frequency: 45, trend: 'up' as const, category: 'Écrans' },
    { name: 'Batterie Samsung', value: 32, cost: totalExpenses * 0.2, frequency: 32, trend: 'stable' as const, category: 'Batteries' },
    { name: 'Connecteur USB-C', value: 28, cost: totalExpenses * 0.15, frequency: 28, trend: 'up' as const, category: 'Connecteurs' },
    { name: 'Vitre arrière', value: 22, cost: totalExpenses * 0.12, frequency: 22, trend: 'down' as const, category: 'Vitres' },
    { name: 'Haut-parleur', value: 18, cost: totalExpenses * 0.1, frequency: 18, trend: 'stable' as const, category: 'Audio' },
    { name: 'Caméra', value: 15, cost: totalExpenses * 0.08, frequency: 15, trend: 'up' as const, category: 'Caméras' },
  ], [totalExpenses]);

  // Customer satisfaction data
  const satisfactionData = useMemo(() => {
    return currentYearData.slice(-6).map(m => ({
      period: MONTHS_FR[m.month - 1].slice(0, 3),
      rating: 4 + Math.random() * 0.8,
      reviews: Math.floor(10 + Math.random() * 20),
      response_rate: 70 + Math.random() * 20
    }));
  }, [currentYearData]);

  const satisfactionBreakdown = useMemo(() => [
    { stars: 5, count: 45, percentage: 45, color: 'hsl(var(--success))' },
    { stars: 4, count: 30, percentage: 30, color: 'hsl(var(--primary))' },
    { stars: 3, count: 15, percentage: 15, color: 'hsl(var(--warning))' },
    { stars: 2, count: 7, percentage: 7, color: 'hsl(var(--destructive))' },
    { stars: 1, count: 3, percentage: 3, color: 'hsl(var(--muted-foreground))' },
  ], []);

  const loading = loadingCurrent || loadingPrevious || loadingStats;

  if (selectedWidgets.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2" id="report-charts-section">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des graphiques...
      </div>
    );
  }

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'monthly-comparison':
        return monthlyComparisonData.length > 0 ? (
          <MonthlyComparisonWidget
            data={monthlyComparisonData}
            totalGrowth={totalGrowth}
            bestMonth={bestMonth}
            worstMonth={worstMonth}
          />
        ) : null;
      
      case 'financial-overview':
        return financialData.length > 0 ? (
          <FinancialOverviewWidget
            data={financialData}
            totalRevenue={totalRevenue}
            totalExpenses={totalExpenses}
            totalProfit={totalProfit}
            averageMargin={averageMargin}
          />
        ) : null;
      
      case 'performance-trends':
        return statistics ? (
          <SAVPerformanceWidget
            performanceData={performanceData}
            statusData={statusData}
            totalSAV={statistics.savStats?.total || 0}
            averageTime={Math.round(statistics.savStats?.averageTime || 0)}
            completionRate={80}
            customerSatisfaction={85}
          />
        ) : null;
      
      case 'annual-stats':
        return annualStatsData.length > 0 ? (
          <AnnualStatsWidget
            monthlyData={annualStatsData}
            currentYear={currentYear}
            totalRevenue={totalRevenue}
            totalSAV={totalSAV}
            averageEfficiency={80}
            yearOverYearGrowth={totalGrowth}
            bestPerformanceMonth={bestMonth}
            worstPerformanceMonth={worstMonth}
          />
        ) : null;
      
      case 'finance-kpis':
        return (
          <FinanceKPIsWidget
            currentMonth={currentMonthData}
            previousMonth={previousMonthData}
            yearTarget={totalRevenue * 1.2}
            monthProgress={Math.min(100, (new Date().getDate() / 30) * 100)}
          />
        );
      
      case 'quote-rejections':
        return <QuoteRejectionWidget />;
      
      case 'late-rate-chart':
        return <MonthlyLateRateChart />;
      
      case 'revenue-breakdown':
        return (
          <RevenueBreakdownWidget
            revenueSources={revenueSources}
            serviceTypes={serviceTypes}
            totalRevenue={totalRevenue}
            topService="Réparation écran"
          />
        );
      
      case 'parts-usage-heatmap':
        return (
          <PartsUsageHeatmapWidget
            partsData={partsData}
            totalParts={partsData.reduce((sum, p) => sum + p.value, 0)}
            totalCost={totalExpenses}
            topCategory="Écrans"
          />
        );
      
      case 'customer-satisfaction':
        return (
          <CustomerSatisfactionWidget
            satisfactionData={satisfactionData}
            satisfactionBreakdown={satisfactionBreakdown}
            averageRating={4.5}
            totalReviews={156}
            responseRate={78}
            trend="up"
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 print:space-y-4" id="report-charts-section">
      {selectedWidgets.map(widgetId => {
        const widget = renderWidget(widgetId);
        if (!widget) return null;
        
        return (
          <div 
            key={widgetId} 
            className="print:break-inside-avoid print:page-break-inside-avoid"
          >
            {widget}
          </div>
        );
      })}
    </div>
  );
}
