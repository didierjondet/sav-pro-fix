import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import { Activity, TrendingUp, Clock, Euro } from 'lucide-react';

interface SAVServiceType {
  type: string;
  count: number;
  percentage: number;
  averageRevenue: number;
  averageTime: number;
  color: string;
  trend: 'up' | 'down' | 'stable';
}

interface SAVTypeDistributionWidgetProps {
  serviceTypes: SAVServiceType[];
  totalSAV: number;
  totalRevenue: number;
  dominantType: string;
}

export const SAVTypeDistributionWidget = ({
  serviceTypes,
  totalSAV,
  totalRevenue,
  dominantType
}: SAVTypeDistributionWidgetProps) => {

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
      default: return <TrendingUp className="w-3 h-3 text-gray-500" />;
    }
  };

  const formatTime = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}j ${remainingHours}h` : `${days}j`;
  };

  // Données pour le graphique en barres (revenus par type)
  const revenueData = serviceTypes.map(type => ({
    type: type.type,
    revenue: type.averageRevenue * type.count,
    count: type.count
  }));

  const chartConfig = {
    revenue: {
      label: "Revenus",
      color: "hsl(var(--primary))",
    },
    count: {
      label: "Nombre de SAV",
      color: "hsl(var(--secondary))",
    },
  };

  // Fonction pour le label personnalisé du pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Masquer les labels pour les petits segments
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Répartition par service
          </div>
          <Badge variant="outline" className="text-xs">
            {dominantType}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* KPIs rapides */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 bg-accent/20 rounded-lg">
            <div className="text-sm font-bold">{totalSAV}</div>
            <div className="text-xs text-muted-foreground">Total SAV</div>
          </div>
          <div className="p-2 bg-accent/20 rounded-lg">
            <div className="text-sm font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground">CA total</div>
          </div>
        </div>

        {/* Graphique en camembert */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Distribution</h4>
          <ChartContainer config={chartConfig} className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={50}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {serviceTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-md">
                          <p className="font-medium">{data.type}</p>
                          <p className="text-sm">SAV: {data.count} ({formatPercent(data.percentage)})</p>
                          <p className="text-sm">CA moyen: {formatCurrency(data.averageRevenue)}</p>
                        </div>
                      );
                    }
                    return null;
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Liste détaillée */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Détails par service</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {serviceTypes.map((type) => (
              <div key={type.type} className="flex items-center justify-between p-2 bg-accent/10 rounded text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="truncate">{type.type}</span>
                  {getTrendIcon(type.trend)}
                </div>
                <div className="flex items-center gap-2 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-bold">{type.count}</span>
                    <span className="text-muted-foreground">{formatPercent(type.percentage)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Métriques moyennes */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Euro className="w-3 h-3" />
              CA moyen
            </div>
            <div className="text-sm font-bold">
              {formatCurrency(serviceTypes.reduce((sum, type) => sum + type.averageRevenue, 0) / serviceTypes.length)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              Temps moyen
            </div>
            <div className="text-sm font-bold">
              {formatTime(serviceTypes.reduce((sum, type) => sum + type.averageTime, 0) / serviceTypes.length)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};