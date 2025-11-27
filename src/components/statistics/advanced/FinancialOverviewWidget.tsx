import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ComposedChart, Area, Bar, Line, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

interface FinancialData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  savCount: number;
}

interface FinancialOverviewWidgetProps {
  data: FinancialData[];
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  averageMargin: number;
}

export const FinancialOverviewWidget = ({
  data,
  totalRevenue,
  totalExpenses, 
  totalProfit,
  averageMargin
}: FinancialOverviewWidgetProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(Math.round(value || 0));

  const formatPercent = (value: number) => `${Math.round(value)}%`;

  const chartConfig = {
    revenue: { label: "Chiffre d'affaires", color: "hsl(var(--success))" },
    expenses: { label: "Dépenses", color: "hsl(var(--destructive))" },
    profit: { label: "Profit", color: "hsl(var(--primary))" },
    margin: { label: "Marge (%)", color: "hsl(var(--warning))" },
    savCount: { label: "Nombre SAV", color: "hsl(var(--info))" }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Vue d'ensemble financière
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* KPIs Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-success">
                <TrendingUp className="h-4 w-4" />
                <span className="text-2xl font-bold">{formatCurrency(totalRevenue)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-destructive">
                <TrendingDown className="h-4 w-4" />
                <span className="text-2xl font-bold">{formatCurrency(totalExpenses)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Dépenses</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary">
                <DollarSign className="h-4 w-4" />
                <span className="text-2xl font-bold">{formatCurrency(totalProfit)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Profit net</p>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${averageMargin > 20 ? 'text-success' : averageMargin > 10 ? 'text-warning' : 'text-destructive'}`}>
                {formatPercent(averageMargin)}
              </div>
              <p className="text-sm text-muted-foreground">Marge moyenne</p>
            </div>
          </div>

          {/* Combined Chart */}
          <div className="h-64">
            <ChartContainer config={chartConfig} className="h-full">
              <ComposedChart data={data}>
                <XAxis 
                  dataKey="date" 
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
                  domain={[0, 100]}
                />
                <YAxis 
                  yAxisId="count"
                  orientation="right"
                  tickLine={false} 
                  axisLine={false}
                  className="text-xs"
                  hide
                />
                
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value, name) => {
                    if (name === 'margin') return [formatPercent(value as number), 'Marge'];
                    if (name === 'savCount') return [value, 'SAV'];
                    return [formatCurrency(value as number), name];
                  }}
                />
                <Legend />
                
                {/* Areas pour le background */}
                <Area
                  yAxisId="currency"
                  type="monotone"
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  fillOpacity={0.1}
                  stroke="none"
                />
                
                {/* Barres pour les données principales */}
                <Bar
                  yAxisId="currency"
                  dataKey="expenses"
                  fill="var(--color-expenses)"
                  radius={2}
                  maxBarSize={40}
                />
                
                {/* Lignes pour les tendances */}
                <Line
                  yAxisId="currency"
                  type="monotone"
                  dataKey="profit"
                  stroke="var(--color-profit)"
                  strokeWidth={3}
                  dot={{ fill: "var(--color-profit)", strokeWidth: 2, r: 4 }}
                />
                
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="margin"
                  stroke="var(--color-margin)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "var(--color-margin)", strokeWidth: 2, r: 3 }}
                />
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};