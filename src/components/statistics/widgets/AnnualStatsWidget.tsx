import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Legend, BarChart, Bar } from 'recharts';
import { Calendar, TrendingUp, Award, Target, Activity } from 'lucide-react';

interface MonthlyStats {
  month: string;
  revenue: number;
  savCount: number;
  averageTime: number;
  customerSatisfaction: number;
  partsUsed: number;
  efficiency: number;
  profit?: number;
}

interface AnnualStatsWidgetProps {
  monthlyData: MonthlyStats[];
  currentYear: number;
  totalRevenue: number;
  totalSAV: number;
  averageEfficiency: number;
  yearOverYearGrowth: number;
  bestPerformanceMonth: string;
  worstPerformanceMonth: string;
}

export const AnnualStatsWidget = ({
  monthlyData,
  currentYear,
  totalRevenue,
  totalSAV,
  averageEfficiency,
  yearOverYearGrowth,
  bestPerformanceMonth,
  worstPerformanceMonth
}: AnnualStatsWidgetProps) => {

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value);

  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPerformanceColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 75) return 'text-blue-600';
    if (efficiency >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  // Calculer les moyennes mensuelles
  const averageMonthlyRevenue = totalRevenue / monthlyData.length;
  const averageMonthlySAV = totalSAV / monthlyData.length;

  const chartConfig = {
    revenue: {
      label: "Chiffre d'affaires",
      color: "hsl(var(--primary))",
    },
    savCount: {
      label: "Nombre de SAV",
      color: "hsl(var(--secondary))",
    },
    efficiency: {
      label: "Efficacité (%)",
      color: "hsl(var(--success))",
    },
    customerSatisfaction: {
      label: "Satisfaction (%)",
      color: "hsl(var(--warning))",
    },
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Statistiques {currentYear}
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ${getGrowthColor(yearOverYearGrowth)}`}
          >
            {formatPercent(yearOverYearGrowth)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* KPIs annuels */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-primary/10 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">CA Total</div>
            <div className="text-sm font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground">{formatCurrency(averageMonthlyRevenue)}/mois</div>
          </div>
          
          <div className="p-2 bg-secondary/10 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">SAV Total</div>
            <div className="text-sm font-bold">{totalSAV}</div>
            <div className="text-xs text-muted-foreground">{Math.round(averageMonthlySAV)}/mois</div>
          </div>
          
          <div className="p-2 bg-success/10 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Efficacité</div>
            <div className={`text-sm font-bold ${getPerformanceColor(averageEfficiency)}`}>
              {averageEfficiency.toFixed(1)}%
            </div>
          </div>
          
          <div className="p-2 bg-accent/10 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Croissance</div>
            <div className={`text-sm font-bold ${getGrowthColor(yearOverYearGrowth)}`}>
              {formatPercent(yearOverYearGrowth)}
            </div>
          </div>
        </div>

        {/* Graphique d'évolution mensuelle */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Évolution mensuelle</h4>
          <ChartContainer config={chartConfig} className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-md min-w-[150px]">
                          <p className="font-semibold text-xs mb-2 text-primary">{label}</p>
                          <div className="space-y-1">
                            <p className="text-xs flex justify-between gap-2">
                              <span className="text-muted-foreground">SAV:</span>
                              <span className="font-semibold">{data.savCount}</span>
                            </p>
                            <p className="text-xs flex justify-between gap-2">
                              <span className="text-muted-foreground">Marge:</span>
                              <span className="font-semibold">{formatCurrency(data.profit || 0)}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--color-revenue)" 
                  strokeWidth={2} 
                  dot={{ r: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="savCount" 
                  stroke="var(--color-savCount)" 
                  strokeWidth={2} 
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Graphique de performance */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Performance mensuelle</h4>
          <ChartContainer config={chartConfig} className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[0, 100]} hide />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-md">
                          <p className="font-medium text-xs mb-1">{label}</p>
                          <p className="text-xs">Efficacité: {data.efficiency}%</p>
                          <p className="text-xs">Satisfaction: {data.customerSatisfaction}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="efficiency" 
                  fill="var(--color-efficiency)" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Résumé des performances */}
        <div className="space-y-1 pt-2 border-t text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Award className="w-3 h-3 text-green-500" />
              Meilleur mois
            </span>
            <span className="font-medium">{bestPerformanceMonth}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3 text-red-500" />
              À améliorer
            </span>
            <span className="font-medium">{worstPerformanceMonth}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Pièces utilisées
            </span>
            <span className="font-medium">
              {monthlyData.reduce((sum, month) => sum + month.partsUsed, 0)} total
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};