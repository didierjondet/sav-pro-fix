import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ComposedChart, Line, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';

interface MonthlyData {
  month: number;
  currentRevenue: number;
  previousRevenue: number;
  currentSavCount: number;
  previousSavCount: number;
  currentProfit: number;
  previousProfit: number;
  growth: number;
}

interface MonthlyComparisonWidgetProps {
  data: MonthlyData[];
  totalGrowth: number;
  bestMonth: number | string;
  worstMonth: number | string;
}

export const MonthlyComparisonWidget = ({
  data,
  totalGrowth,
  bestMonth,
  worstMonth
}: MonthlyComparisonWidgetProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const formatPercent = (value: number) => `${Math.round(value >= 0 ? value : -value)}%`;
  const formatPercentWithSign = (value: number) => `${value >= 0 ? '+' : ''}${Math.round(value)}%`;

  const chartConfig = {
    currentRevenue: { label: "CA actuel", color: "hsl(var(--primary))" },
    previousRevenue: { label: "CA précédent", color: "hsl(var(--muted-foreground))" },
    growth: { label: "Croissance (%)", color: "hsl(var(--success))" },
    currentSavCount: { label: "SAV actuels", color: "hsl(var(--info))" },
    previousSavCount: { label: "SAV précédents", color: "hsl(var(--secondary))" }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Comparaison mensuelle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Indicateurs de performance */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 ${totalGrowth > 0 ? 'text-success' : 'text-destructive'}`}>
                {totalGrowth > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-xl font-bold">{formatPercentWithSign(totalGrowth)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Croissance globale</p>
            </div>
            
            <div className="text-center">
              <Badge variant="secondary" className="text-success border-success">
                <BarChart3 className="h-3 w-3 mr-1" />
                {bestMonth}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">Meilleur mois</p>
            </div>
            
            <div className="text-center">
              <Badge variant="outline" className="text-destructive border-destructive">
                <BarChart3 className="h-3 w-3 mr-1" />
                {worstMonth}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">Mois difficile</p>
            </div>

            <div className="text-center">
              <div className="text-xl font-bold">
                {data.filter(d => d.growth > 0).length}/{data.length}
              </div>
              <p className="text-sm text-muted-foreground">Mois positifs</p>
            </div>
          </div>

          {/* Graphique de comparaison */}
          <div className="h-64">
            <ChartContainer config={chartConfig} className="h-full">
              <ComposedChart data={data}>
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false} 
                  className="text-xs"
                />
                <YAxis 
                  yAxisId="currency"
                  orientation="left"
                  tickFormatter={(v) => `${Math.round(v/1000)}k€`}
                  tickLine={false} 
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  yAxisId="percent"
                  orientation="right"
                  tickFormatter={(v) => `${Math.round(v)}%`}
                  tickLine={false} 
                  axisLine={false}
                  className="text-xs"
                />
                
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => {
                      if (name === 'growth') return [formatPercentWithSign(value as number), 'Croissance'];
                      if (String(name).includes('SavCount')) return [value, String(name).includes('current') ? 'SAV actuels' : 'SAV précédents'];
                      return [formatCurrency(value as number), String(name).includes('current') ? 'CA actuel' : 'CA précédent'];
                    }}
                  />
                <Legend />
                
                {/* Barres pour les revenus actuels et précédents */}
                <Bar
                  yAxisId="currency"
                  dataKey="currentRevenue"
                  fill="var(--color-currentRevenue)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  yAxisId="currency"
                  dataKey="previousRevenue"
                  fill="var(--color-previousRevenue)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={40}
                />
                
                {/* Ligne pour la croissance */}
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="growth"
                  stroke="var(--color-growth)"
                  strokeWidth={3}
                  dot={{ fill: "var(--color-growth)", strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ChartContainer>
          </div>

          {/* Tableau récapitulatif des 3 derniers mois */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            {data.slice(-3).map((month, index) => (
              <div key={month.month} className="text-center space-y-2">
                <h4 className="font-medium">{month.month}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>CA:</span>
                    <span className="font-medium">{formatCurrency(month.currentRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SAV:</span>
                    <span className="font-medium">{month.currentSavCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Évolution:</span>
                    <span className={`font-medium ${month.growth > 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatPercentWithSign(month.growth)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};