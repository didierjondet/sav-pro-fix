import { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MonthlyComparisonWidget } from '@/components/statistics/advanced/MonthlyComparisonWidget';
import { FinancialOverviewWidget } from '@/components/statistics/advanced/FinancialOverviewWidget';
import { SAVPerformanceWidget } from '@/components/statistics/advanced/SAVPerformanceWidget';
import { useMonthlyStatistics } from '@/hooks/useMonthlyStatistics';
import { useStatistics } from '@/hooks/useStatistics';
import { BarChart3 } from 'lucide-react';

interface ChartOptions {
  monthlyComparison: boolean;
  financialOverview: boolean;
  savPerformance: boolean;
}

interface ReportChartsSectionProps {
  chartOptions: ChartOptions;
  onChartOptionsChange: (options: ChartOptions) => void;
  dateRange: { start: Date; end: Date };
}

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function ReportChartsSection({ chartOptions, onChartOptionsChange, dateRange }: ReportChartsSectionProps) {
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

  const handleCheckboxChange = (key: keyof ChartOptions) => {
    onChartOptionsChange({
      ...chartOptions,
      [key]: !chartOptions[key]
    });
  };

  const hasAnyChartSelected = chartOptions.monthlyComparison || chartOptions.financialOverview || chartOptions.savPerformance;
  const loading = loadingCurrent || loadingPrevious || loadingStats;

  return (
    <Card id="report-charts-section">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Graphiques et statistiques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checkboxes */}
        <div className="flex flex-wrap gap-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="monthlyComparison" 
              checked={chartOptions.monthlyComparison}
              onCheckedChange={() => handleCheckboxChange('monthlyComparison')}
            />
            <Label htmlFor="monthlyComparison" className="cursor-pointer">Comparaison mensuelle</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="financialOverview" 
              checked={chartOptions.financialOverview}
              onCheckedChange={() => handleCheckboxChange('financialOverview')}
            />
            <Label htmlFor="financialOverview" className="cursor-pointer">Vue d'ensemble financière</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="savPerformance" 
              checked={chartOptions.savPerformance}
              onCheckedChange={() => handleCheckboxChange('savPerformance')}
            />
            <Label htmlFor="savPerformance" className="cursor-pointer">Performance SAV</Label>
          </div>
        </div>

        {/* Charts Display */}
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Chargement des graphiques...
          </div>
        ) : hasAnyChartSelected ? (
          <div className="space-y-6">
            {chartOptions.monthlyComparison && monthlyComparisonData.length > 0 && (
              <div className="print-chart">
                <MonthlyComparisonWidget
                  data={monthlyComparisonData}
                  totalGrowth={totalGrowth}
                  bestMonth={bestMonth}
                  worstMonth={worstMonth}
                />
              </div>
            )}
            
            {chartOptions.financialOverview && financialData.length > 0 && (
              <div className="print-chart">
                <FinancialOverviewWidget
                  data={financialData}
                  totalRevenue={totalRevenue}
                  totalExpenses={totalExpenses}
                  totalProfit={totalProfit}
                  averageMargin={averageMargin}
                />
              </div>
            )}
            
            {chartOptions.savPerformance && statistics && (
              <div className="print-chart">
                <SAVPerformanceWidget
                  performanceData={performanceData}
                  statusData={statusData}
                  totalSAV={statistics.savStats?.total || 0}
                  averageTime={Math.round(statistics.savStats?.averageTime || 0)}
                  completionRate={80}
                  customerSatisfaction={85}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Sélectionnez au moins un graphique à afficher
          </div>
        )}
      </CardContent>
    </Card>
  );
}
