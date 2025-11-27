import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Legend } from 'recharts';
import { BarChart3, TrendingUp, Target, AlertCircle } from 'lucide-react';

interface ProfitabilityData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  target: number;
  marginTarget: number;
}

interface MonthlyProfitabilityWidgetProps {
  data: ProfitabilityData[];
  averageMargin: number;
  bestMonth: string;
  worstMonth: string;
  targetAchieved: boolean;
  monthsAboveTarget: number;
}

export const MonthlyProfitabilityWidget = ({
  data,
  averageMargin,
  bestMonth,
  worstMonth,
  targetAchieved,
  monthsAboveTarget
}: MonthlyProfitabilityWidgetProps) => {

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR', 
      notation: 'compact',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(Math.round(value));

  const formatPercent = (value: number) => `${Math.round(value)}%`;

  const getMarginStatus = (margin: number, target: number) => {
    if (margin >= target + 10) return { color: 'text-green-600', status: 'Excellent' };
    if (margin >= target) return { color: 'text-blue-600', status: 'Objectif' };
    if (margin >= target - 5) return { color: 'text-orange-600', status: 'Proche' };
    return { color: 'text-red-600', status: 'Faible' };
  };

  const currentMargin = data[data.length - 1]?.margin || 0;
  const currentTarget = data[data.length - 1]?.marginTarget || 50;
  const marginStatus = getMarginStatus(currentMargin, currentTarget);

  const chartConfig = {
    revenue: {
      label: "Chiffre d'affaires",
      color: "hsl(var(--primary))",
    },
    expenses: {
      label: "Dépenses",
      color: "hsl(var(--destructive))",
    },
    profit: {
      label: "Profit",
      color: "hsl(var(--success))",
    },
    margin: {
      label: "Marge (%)",
      color: "hsl(var(--warning))",
    },
    target: {
      label: "Objectif marge",
      color: "hsl(var(--muted-foreground))",
    },
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Rentabilité mensuelle
          </div>
          <Badge 
            variant={targetAchieved ? "default" : "secondary"}
            className={`text-xs ${marginStatus.color}`}
          >
            {marginStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* KPIs de performance */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-accent/10 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Target className="w-3 h-3" />
              Marge moyenne
            </div>
            <div className={`text-sm font-bold ${marginStatus.color}`}>
              {formatPercent(averageMargin)}
            </div>
          </div>
          
          <div className="p-2 bg-accent/10 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingUp className="w-3 h-3" />
              Mois performants
            </div>
            <div className="text-sm font-bold">
              {monthsAboveTarget}/{data.length}
            </div>
          </div>
        </div>

        {/* Graphique combiné */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Évolution CA vs Marge</h4>
          <ChartContainer config={chartConfig} className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(value) => `${Math.round(value/1000)}k€`}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${Math.round(value)}%`}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-md">
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-sm" style={{ color: entry.color }}>
                              {entry.dataKey === 'margin' || entry.dataKey === 'target'
                                ? `${entry.name}: ${formatPercent(entry.value)}`
                                : `${entry.name}: ${formatCurrency(entry.value)}`
                              }
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                
                {/* Aires pour CA et dépenses */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stackId="1"
                  stroke="var(--color-revenue)"
                  fill="var(--color-revenue)"
                  fillOpacity={0.6}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="expenses"
                  stackId="2"
                  stroke="var(--color-expenses)"
                  fill="var(--color-expenses)"
                  fillOpacity={0.6}
                />
                
                {/* Lignes pour marge */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margin"
                  stroke="var(--color-margin)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="target"
                  stroke="var(--color-target)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Résumé des performances */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              Meilleur mois
            </span>
            <span className="font-medium">{bestMonth}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              Mois difficile
            </span>
            <span className="font-medium">{worstMonth}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Objectif annuel</span>
            <span className={`font-medium ${targetAchieved ? 'text-green-600' : 'text-orange-600'}`}>
              {targetAchieved ? '✓ Atteint' : '⚠ En cours'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};