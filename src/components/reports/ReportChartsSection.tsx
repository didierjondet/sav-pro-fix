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
import { useSatisfactionSurveys } from '@/hooks/useSatisfactionSurveys';
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
  reportData?: {
    items: Array<{
      device_brand: string | null;
      device_model: string | null;
      selling_price: number;
      purchase_cost: number;
    }>;
    totals: { revenue: number };
  };
}

// Fonction utilitaire pour catégoriser les appareils
const categorizeDevice = (brand: string | null, model: string | null): string => {
  const combined = `${brand || ''} ${model || ''}`.toLowerCase();
  
  if (combined.includes('iphone') || combined.includes('samsung') || combined.includes('huawei') || 
      combined.includes('xiaomi') || combined.includes('oppo') || combined.includes('pixel') ||
      combined.includes('oneplus') || combined.includes('phone') || combined.includes('téléphone')) {
    return 'Téléphones';
  }
  if (combined.includes('ipad') || combined.includes('tablette') || combined.includes('tab') || 
      combined.includes('galaxy tab')) {
    return 'Tablettes';
  }
  if (combined.includes('macbook') || combined.includes('laptop') || combined.includes('pc') || 
      combined.includes('ordinateur') || combined.includes('dell') || combined.includes('hp') ||
      combined.includes('asus') || combined.includes('lenovo') || combined.includes('acer')) {
    return 'Ordinateurs';
  }
  if (combined.includes('playstation') || combined.includes('xbox') || combined.includes('nintendo') || 
      combined.includes('switch') || combined.includes('ps4') || combined.includes('ps5') ||
      combined.includes('console')) {
    return 'Consoles';
  }
  if (combined.includes('watch') || combined.includes('montre') || combined.includes('airpods') ||
      combined.includes('écouteurs') || combined.includes('accessoire')) {
    return 'Accessoires';
  }
  
  return 'Autres';
};

export function ReportChartsSection({ selectedWidgets, dateRange, reportData }: ReportChartsSectionProps) {
  // Extraire l'année depuis la plage de dates sélectionnée
  const selectedYear = dateRange.start.getFullYear();
  const selectedPreviousYear = selectedYear - 1;
  const selectedMonthIndex = dateRange.start.getMonth();
  
  // Calculer la durée en jours pour déterminer la période
  const periodDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const statisticsPeriod = periodDays <= 7 ? '7d' : 
                           periodDays <= 31 ? '30d' : 
                           periodDays <= 90 ? '3m' : 
                           periodDays <= 180 ? '6m' : '1y';
  
  const { data: currentYearData, loading: loadingCurrent } = useMonthlyStatistics(selectedYear);
  const { data: previousYearData, loading: loadingPrevious } = useMonthlyStatistics(selectedPreviousYear);
  const statistics = useStatistics(statisticsPeriod);
  const loadingStats = statistics.loading;
  
  // Récupérer les vraies données de satisfaction
  const satisfactionStats = useSatisfactionSurveys();

  // Filtrer les données mensuelles selon la plage sélectionnée
  const filteredMonthlyData = useMemo(() => {
    const startMonth = dateRange.start.getMonth();
    const endMonth = dateRange.end.getMonth();
    const startYear = dateRange.start.getFullYear();
    const endYear = dateRange.end.getFullYear();
    
    // Si même année, filtrer les mois dans la plage
    if (startYear === endYear && startYear === selectedYear) {
      return currentYearData.filter((_, index) => index >= startMonth && index <= endMonth);
    }
    
    return currentYearData;
  }, [currentYearData, dateRange, selectedYear]);

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
  }, [currentYearData, previousYearData, dateRange]);

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

  // Prepare financial overview data - utiliser les données filtrées
  const financialData = useMemo(() => {
    return filteredMonthlyData.map(m => ({
      date: MONTHS_FR[m.month - 1].slice(0, 3),
      revenue: m.revenue,
      expenses: m.costs,
      profit: m.profit,
      margin: m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0,
      savCount: m.savCount
    }));
  }, [filteredMonthlyData]);

  // Totaux basés sur les données filtrées
  const totalRevenue = filteredMonthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = filteredMonthlyData.reduce((sum, m) => sum + m.costs, 0);
  const totalProfit = filteredMonthlyData.reduce((sum, m) => sum + m.profit, 0);
  const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const totalSAV = filteredMonthlyData.reduce((sum, m) => sum + m.savCount, 0);

  // Prepare SAV performance data - utiliser vraies données de satisfaction
  const performanceData = useMemo(() => {
    if (!statistics) return [];
    const avgTime = statistics.savStats?.averageTime || 0;
    const lateRate = statistics.savStats?.lateRate || 0;
    const total = statistics.savStats?.total || 0;
    
    // Utiliser la vraie note de satisfaction (convertie en pourcentage)
    const realSatisfaction = satisfactionStats.averageRating > 0 
      ? (satisfactionStats.averageRating / 5) * 100 
      : 0;
    
    return [
      { metric: 'Rapidité', value: Math.min(100, 100 - (avgTime / 24) * 10), maxValue: 100, fullMark: 100 },
      { metric: 'Ponctualité', value: Math.max(0, 100 - lateRate), maxValue: 100, fullMark: 100 },
      { metric: 'Volume', value: Math.min(100, total > 0 ? 80 : 0), maxValue: 100, fullMark: 100 },
      { metric: 'Rentabilité', value: Math.min(100, Math.max(0, averageMargin * 2)), maxValue: 100, fullMark: 100 },
      { metric: 'Satisfaction', value: realSatisfaction, maxValue: 100, fullMark: 100 }
    ];
  }, [statistics, averageMargin, satisfactionStats.averageRating]);

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

  // Annual stats data - utiliser les données filtrées avec vraies données satisfaction
  const annualStatsData = useMemo(() => {
    const realSatisfaction = satisfactionStats.averageRating > 0 
      ? (satisfactionStats.averageRating / 5) * 100 
      : 0;
    const realEfficiency = statistics?.savStats?.lateRate !== undefined 
      ? Math.max(0, 100 - statistics.savStats.lateRate) 
      : 0;
    
    return filteredMonthlyData.map(m => ({
      month: MONTHS_FR[m.month - 1].slice(0, 3),
      revenue: m.revenue,
      savCount: m.savCount,
      averageTime: 0,
      customerSatisfaction: realSatisfaction,
      partsUsed: 0,
      efficiency: realEfficiency,
      profit: m.profit
    }));
  }, [filteredMonthlyData, satisfactionStats.averageRating, statistics?.savStats?.lateRate]);

  // Finance KPIs data - basé sur le mois sélectionné
  const currentMonthData = useMemo(() => {
    // Utiliser le mois de la date de début sélectionnée
    const data = currentYearData[selectedMonthIndex] || { revenue: 0, costs: 0, profit: 0, savCount: 0 };
    // Mois précédent (avec gestion du passage à l'année précédente)
    const prevMonthIndex = selectedMonthIndex === 0 ? 11 : selectedMonthIndex - 1;
    const prevDataSource = selectedMonthIndex === 0 ? previousYearData : currentYearData;
    const prevData = prevDataSource[prevMonthIndex] || { revenue: 0, costs: 0, profit: 0, savCount: 0 };
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
  }, [currentYearData, previousYearData, selectedMonthIndex]);

  const previousMonthData = useMemo(() => {
    // Mois précédent celui sélectionné
    const prevMonthIndex = selectedMonthIndex === 0 ? 11 : selectedMonthIndex - 1;
    const dataSource = selectedMonthIndex === 0 ? previousYearData : currentYearData;
    const data = dataSource[prevMonthIndex] || { revenue: 0, costs: 0, profit: 0, savCount: 0 };
    
    // Mois encore avant
    const prevPrevMonthIndex = prevMonthIndex === 0 ? 11 : prevMonthIndex - 1;
    const prevDataSource = prevMonthIndex === 0 ? previousYearData : dataSource;
    const prevData = prevDataSource[prevPrevMonthIndex] || { revenue: 0, costs: 0, profit: 0, savCount: 0 };
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
  }, [currentYearData, previousYearData, selectedMonthIndex]);

  // Revenue breakdown data - calculer depuis reportData pour respecter la période sélectionnée
  const revenueSources = useMemo(() => {
    // Utiliser reportData qui respecte le dateRange
    if (reportData && reportData.items.length > 0) {
      const categoryRevenue: Record<string, { revenue: number; count: number }> = {};
      
      reportData.items.forEach(item => {
        const category = categorizeDevice(item.device_brand, item.device_model);
        
        if (!categoryRevenue[category]) {
          categoryRevenue[category] = { revenue: 0, count: 0 };
        }
        categoryRevenue[category].revenue += item.selling_price;
        categoryRevenue[category].count += 1;
      });
      
      const totalRev = reportData.totals.revenue || 1;
      const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
      
      return Object.entries(categoryRevenue)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([category, data], index) => ({
          name: category,
          value: data.revenue,
          percentage: (data.revenue / totalRev) * 100,
          color: colors[index % colors.length]
        }));
    }
    
    // Fallback si pas de données
    return [
      { name: 'Aucune donnée', value: 0, percentage: 0, color: 'hsl(var(--muted))' },
    ];
  }, [reportData]);

  // Service types - utiliser reportData pour respecter la période
  const serviceTypes = useMemo(() => {
    if (reportData && reportData.items.length > 0) {
      const deviceRevenue: Record<string, { type: string; revenue: number; count: number }> = {};
      
      reportData.items.forEach(item => {
        const deviceKey = `${item.device_brand || 'Inconnu'} ${item.device_model || ''}`.trim();
        
        if (!deviceRevenue[deviceKey]) {
          deviceRevenue[deviceKey] = { type: deviceKey, revenue: 0, count: 0 };
        }
        deviceRevenue[deviceKey].revenue += item.selling_price;
        deviceRevenue[deviceKey].count += 1;
      });
      
      return Object.values(deviceRevenue)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
        .map(device => ({
          type: device.type,
          revenue: device.revenue,
          count: device.count,
          averageValue: device.count > 0 ? device.revenue / device.count : 0
        }));
    }
    
    return [];
  }, [reportData]);

  // Parts usage data - utiliser les vraies pièces
  const partsData = useMemo(() => {
    const topParts = statistics?.topParts || [];
    
    if (topParts.length > 0) {
      return topParts.slice(0, 6).map((part) => ({
        name: part.name,
        value: part.quantity,
        cost: part.revenue,
        frequency: part.quantity,
        trend: 'stable' as const,
        category: 'Pièces'
      }));
    }
    
    return [];
  }, [statistics?.topParts]);

  // Customer satisfaction data - utiliser les vraies données de satisfaction
  const satisfactionData = useMemo(() => {
    // Utiliser les vraies données mensuelles de satisfaction
    if (satisfactionStats.monthlyData && satisfactionStats.monthlyData.length > 0) {
      return satisfactionStats.monthlyData;
    }
    
    // Retourner tableau vide si pas de données
    return [];
  }, [satisfactionStats.monthlyData]);

  // Satisfaction breakdown - utiliser les vraies données
  const satisfactionBreakdown = useMemo(() => {
    if (satisfactionStats.satisfactionBreakdown && satisfactionStats.satisfactionBreakdown.length > 0) {
      return satisfactionStats.satisfactionBreakdown.map(item => ({
        ...item,
        color: item.stars === 5 ? 'hsl(var(--success))' : 
               item.stars === 4 ? 'hsl(var(--primary))' : 
               item.stars === 3 ? 'hsl(var(--warning))' : 
               item.stars === 2 ? 'hsl(var(--destructive))' : 
               'hsl(var(--muted-foreground))'
      }));
    }
    
    return [];
  }, [satisfactionStats.satisfactionBreakdown]);


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
        // Calculer les vrais taux depuis les données
        const realCompletionRate = statistics?.savStats?.total > 0 
          ? Math.max(0, 100 - (statistics.savStats.lateRate || 0)) 
          : 0;
        const realCustomerSat = satisfactionStats.averageRating > 0 
          ? (satisfactionStats.averageRating / 5) * 100 
          : 0;
        
        return statistics ? (
          <SAVPerformanceWidget
            performanceData={performanceData}
            statusData={statusData}
            totalSAV={statistics.savStats?.total || 0}
            averageTime={Math.round(statistics.savStats?.averageTime || 0)}
            completionRate={Math.round(realCompletionRate)}
            customerSatisfaction={Math.round(realCustomerSat)}
          />
        ) : null;
      
      case 'annual-stats':
        // Calculer la vraie efficacité moyenne
        const realAvgEfficiency = statistics?.savStats?.lateRate !== undefined 
          ? Math.max(0, 100 - statistics.savStats.lateRate) 
          : 0;
        
        return annualStatsData.length > 0 ? (
          <AnnualStatsWidget
            monthlyData={annualStatsData}
            currentYear={selectedYear}
            totalRevenue={totalRevenue}
            totalSAV={totalSAV}
            averageEfficiency={Math.round(realAvgEfficiency)}
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
        return <QuoteRejectionWidget dateRange={dateRange} />;
      
      case 'late-rate-chart':
        return <MonthlyLateRateChart year={selectedYear} />;
      
      case 'revenue-breakdown':
        // Trouver le top service basé sur le revenu le plus élevé
        const topServiceName = serviceTypes.length > 0 
          ? serviceTypes.reduce((a, b) => a.revenue > b.revenue ? a : b).type 
          : 'N/A';
        
        return (
          <RevenueBreakdownWidget
            revenueSources={revenueSources}
            serviceTypes={serviceTypes}
            totalRevenue={totalRevenue}
            topService={topServiceName}
          />
        );
      
      case 'parts-usage-heatmap':
        // Trouver la top catégorie depuis les vraies données
        const topCategoryName = partsData.length > 0 ? partsData[0].name : 'N/A';
        
        return (
          <PartsUsageHeatmapWidget
            partsData={partsData}
            totalParts={partsData.reduce((sum, p) => sum + p.value, 0)}
            totalCost={totalExpenses}
            topCategory={topCategoryName}
          />
        );
      
      case 'customer-satisfaction':
        return (
          <CustomerSatisfactionWidget
            satisfactionData={satisfactionData}
            satisfactionBreakdown={satisfactionBreakdown}
            averageRating={satisfactionStats.averageRating || 0}
            totalReviews={satisfactionStats.totalReviews || 0}
            responseRate={satisfactionStats.responseRate || 0}
            trend={satisfactionStats.trend || 'stable'}
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
