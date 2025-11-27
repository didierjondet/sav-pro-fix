import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, Treemap, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Package, TrendingUp, Zap } from 'lucide-react';

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

  // Préparer les données pour le treemap
  const treemapData = partsData.map(part => ({
    name: part.name,
    size: part.value,
    cost: part.cost,
    fill: part.trend === 'up' ? 'hsl(var(--success))' : 
          part.trend === 'down' ? 'hsl(var(--destructive))' : 
          'hsl(var(--primary))'
  }));

  // Données pour le graphique de fréquence
  const frequencyData = partsData
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 8)
    .map(part => ({
      name: part.name.length > 12 ? part.name.substring(0, 12) + '...' : part.name,
      frequency: part.frequency,
      cost: part.cost
    }));

  const chartConfig = {
    frequency: { label: "Fréquence", color: "hsl(var(--primary))" },
    cost: { label: "Coût", color: "hsl(var(--secondary))" }
  };

  const CustomTreemapLabel = (props: any) => {
    const { x, y, width, height, name, size } = props;
    
    if (width < 50 || height < 30) return null;
    
    return (
      <text 
        x={x + width / 2} 
        y={y + height / 2} 
        textAnchor="middle" 
        dominantBaseline="middle"
        className="fill-white text-xs font-medium"
      >
        <tspan x={x + width / 2} dy="-5">{name}</tspan>
        <tspan x={x + width / 2} dy="15" className="text-xs">{size}</tspan>
      </text>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Utilisation des pièces
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{totalParts}</span>
              </div>
              <p className="text-sm text-muted-foreground">Pièces utilisées</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-2xl font-bold">{formatCurrency(totalCost)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Coût total</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-4 w-4 text-warning" />
                <span className="text-lg font-bold">{topCategory}</span>
              </div>
              <p className="text-sm text-muted-foreground">Catégorie principale</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Treemap - Volume d'utilisation */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Volume par pièce</h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    aspectRatio={4/3}
                    stroke="white"
                    content={<CustomTreemapLabel />}
                  />
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground">
                Taille = quantité utilisée. Couleur = tendance.
              </p>
            </div>

            {/* Bar Chart - Fréquence d'utilisation */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Fréquence d'utilisation</h4>
              <div className="h-32">
                <ChartContainer config={chartConfig} className="h-full">
                  <BarChart data={frequencyData} layout="horizontal">
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={80}
                      className="text-xs"
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value, name) => {
                        if (name === 'cost') return [formatCurrency(value as number), 'Coût moyen'];
                        return [value, 'Utilisations'];
                      }}
                    />
                    <Bar 
                      dataKey="frequency" 
                      fill="var(--color-frequency)" 
                      radius={[0, 2, 2, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
              <p className="text-xs text-muted-foreground">
                Nombre d'utilisations par pièce
              </p>
            </div>
          </div>

          {/* Légende des tendances */}
          <div className="flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-success" />
              <span>Tendance à la hausse</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>Stable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-destructive" />
              <span>Tendance à la baisse</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};