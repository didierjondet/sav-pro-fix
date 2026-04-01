import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ComposedChart, Line, Bar, XAxis, YAxis, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Trophy, AlertTriangle } from 'lucide-react';

interface MonthlyData {
  month: number;
  monthName: string;
  currentRevenue: number;
  previousRevenue: number;
  currentSavCount: number;
  previousSavCount: number;
  currentProfit: number;
  previousProfit: number;
  growth: number | null;
}

interface MonthlyComparisonWidgetProps {
  data: MonthlyData[];
  totalGrowth: number;
  bestMonth: string;
  worstMonth: string;
}

export const MonthlyComparisonWidget = ({
  data,
  totalGrowth,
  bestMonth,
  worstMonth
}: MonthlyComparisonWidgetProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0);

  const formatPercentWithSign = (value: number | null) => {
    if (value === null) return 'Nouveau';
    return `${value >= 0 ? '+' : ''}${Math.round(value)}%`;
  };

  // Filter months that have a valid N-1 reference for KPI calculations
  const monthsWithReference = data.filter(d => d.growth !== null);
  const positiveMonths = monthsWithReference.filter(d => (d.growth as number) > 0).length;

  const chartConfig = {
    currentRevenue: { label: "CA actuel", color: "hsl(var(--primary))" },
    previousRevenue: { label: "CA précédent", color: "hsl(var(--muted-foreground))" },
    growth: { label: "Croissance (%)", color: "hsl(var(--success))" },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5 text-primary" />
          Comparaison mensuelle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI row - responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            {totalGrowth === null ? (
              <>
                <div className="flex items-center justify-center gap-1 text-blue-500">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm font-bold">Nouveau</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pas de réf. N-1</p>
              </>
            ) : (
              <>
                <div className={`flex items-center justify-center gap-1 ${totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="text-lg font-bold">{formatPercentWithSign(totalGrowth)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Croissance</p>
              </>
            )}
          </div>
          
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-semibold truncate">{bestMonth}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Meilleur mois</p>
          </div>
          
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold truncate">{worstMonth}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mois difficile</p>
          </div>

          <div className="rounded-lg border bg-card p-3 text-center">
            <span className="text-lg font-bold text-primary">
              {data.filter(d => d.growth > 0).length}<span className="text-muted-foreground font-normal text-sm">/{data.length}</span>
            </span>
            <p className="text-xs text-muted-foreground mt-1">Mois positifs</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-56 sm:h-64 w-full">
          <ChartContainer config={chartConfig} className="h-full w-full !aspect-auto">
            <ComposedChart data={data}>
              <XAxis 
                dataKey="monthName" 
                tickFormatter={(value) => value ? value.slice(0, 3) : ''}
                tickLine={false} 
                axisLine={false} 
                className="text-xs"
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                yAxisId="currency"
                orientation="left"
                tickFormatter={(v) => `${Math.round(v/1000)}k`}
                tickLine={false} 
                axisLine={false}
                width={35}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                yAxisId="percent"
                orientation="right"
                tickFormatter={(v) => `${Math.round(v)}%`}
                tickLine={false} 
                axisLine={false}
                width={35}
                tick={{ fontSize: 10 }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value, name) => {
                  if (name === 'growth') return [formatPercentWithSign(value as number), 'Croissance'];
                  return [formatCurrency(value as number), String(name).includes('current') ? 'CA actuel' : 'CA précédent'];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="currency" dataKey="currentRevenue" fill="var(--color-currentRevenue)" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar yAxisId="currency" dataKey="previousRevenue" fill="var(--color-previousRevenue)" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Line yAxisId="percent" type="monotone" dataKey="growth" stroke="var(--color-growth)" strokeWidth={2} dot={{ fill: "var(--color-growth)", strokeWidth: 2, r: 3 }} />
            </ComposedChart>
          </ChartContainer>
        </div>

        {/* Monthly recap - scrollable on mobile */}
        <div className="border-t pt-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Récapitulatif des 3 derniers mois</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {data.slice(-3).map((month) => (
              <div key={month.month} className="flex sm:flex-col items-center sm:items-stretch justify-between gap-2 rounded-lg border p-2.5">
                <span className="font-medium text-sm capitalize sm:text-center">{month.monthName}</span>
                <div className="flex sm:flex-col gap-3 sm:gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">CA:</span>
                    <span className="font-semibold">{formatCurrency(month.currentRevenue)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">SAV:</span>
                    <span className="font-semibold">{month.currentSavCount}</span>
                  </div>
                  <Badge variant={month.growth >= 0 ? "default" : "destructive"} className="text-[10px] h-5 px-1.5">
                    {formatPercentWithSign(month.growth)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
