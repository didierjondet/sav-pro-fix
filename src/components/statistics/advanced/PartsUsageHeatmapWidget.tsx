import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { Package, TrendingUp, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PartsUsageData {
  name: string;
  value: number;
  cost: number;
  frequency: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
}

interface PartsUsageHeatmapWidgetProps {
  partsData: PartsUsageData[];
  totalParts: number;
  totalCost: number;
  topCategory: string;
}

export const PartsUsageHeatmapWidget = ({
  partsData,
  totalParts,
  totalCost,
  topCategory
}: PartsUsageHeatmapWidgetProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(Math.round(value || 0));

  const barData = partsData
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 6)
    .map(part => ({
      name: part.name.length > 18 ? part.name.substring(0, 18) + '…' : part.name,
      fullName: part.name,
      quantity: part.frequency,
      cost: part.cost,
      trend: part.trend,
    }));

  const chartConfig = {
    quantity: { label: "Quantité", color: "hsl(var(--primary))" },
  };

  const trendColors = {
    up: 'hsl(var(--success))',
    down: 'hsl(var(--destructive))',
    stable: 'hsl(var(--primary))',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-5 w-5 text-primary" />
          Utilisation des pièces
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs - responsive */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold">{totalParts}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pièces utilisées</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Coût total</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold truncate">{topCategory}</span>
            </div>
            <p className="text-xs text-muted-foreground">Top pièce</p>
          </div>
        </div>

        {partsData.length > 0 ? (
          <>
            {/* Horizontal bar chart */}
            <div className="h-48 sm:h-56 w-full">
              <ChartContainer config={chartConfig} className="h-full w-full !aspect-auto">
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={110}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name, props) => {
                      const item = props?.payload;
                      return [
                        `${value} utilisations — ${formatCurrency(item?.cost || 0)}`,
                        item?.fullName || 'Pièce'
                      ];
                    }}
                  />
                  <Bar dataKey="quantity" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={trendColors[entry.trend]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>

            {/* Parts list for mobile - cards view */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:hidden">
              {barData.slice(0, 6).map((part, i) => (
                <div key={i} className="rounded-lg border p-2 text-center">
                  <p className="text-xs font-medium truncate">{part.fullName}</p>
                  <p className="text-lg font-bold text-primary">{part.quantity}</p>
                  <p className="text-[10px] text-muted-foreground">{formatCurrency(part.cost)}</p>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                <span className="text-muted-foreground">Hausse</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                <span className="text-muted-foreground">Stable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-destructive" />
                <span className="text-muted-foreground">Baisse</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune donnée de pièces pour cette période
          </div>
        )}
      </CardContent>
    </Card>
  );
};
