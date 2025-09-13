import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Activity, Clock, Target, TrendingUp } from 'lucide-react';

interface SAVPerformanceData {
  metric: string;
  value: number;
  maxValue: number;
  fullMark: number;
}

interface SAVStatusData {
  name: string;
  value: number;
  color: string;
}

interface SAVPerformanceWidgetProps {
  performanceData: SAVPerformanceData[];
  statusData: SAVStatusData[];
  totalSAV: number;
  averageTime: number;
  completionRate: number;
  customerSatisfaction: number;
}

export const SAVPerformanceWidget = ({
  performanceData,
  statusData,
  totalSAV,
  averageTime,
  completionRate,
  customerSatisfaction
}: SAVPerformanceWidgetProps) => {
  const radarConfig = {
    value: { label: "Performance", color: "hsl(var(--primary))" }
  };

  const pieConfig = {
    pending: { label: "En attente", color: "hsl(var(--warning))" },
    inProgress: { label: "En cours", color: "hsl(var(--info))" },
    ready: { label: "Prêt", color: "hsl(var(--success))" },
    delivered: { label: "Livré", color: "hsl(var(--muted-foreground))" }
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance SAV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6 h-full">
          {/* Radar Chart - Performance globale */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-center">Indicateurs de performance</h4>
            <div className="h-48">
              <ChartContainer config={radarConfig} className="h-full">
                <RadarChart data={performanceData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    className="text-xs"
                  />
                  <PolarRadiusAxis 
                    angle={0} 
                    domain={[0, 100]}
                    tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                    tickCount={4}
                  />
                  <Radar
                    name="Performance"
                    dataKey="value"
                    stroke="var(--color-value)"
                    fill="var(--color-value)"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [`${value}%`, name]}
                  />
                </RadarChart>
              </ChartContainer>
            </div>
            
            {/* KPIs sous le radar */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3 text-info" />
                  <span className="text-lg font-bold">{averageTime}h</span>
                </div>
                <p className="text-xs text-muted-foreground">Temps moyen</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Target className="h-3 w-3 text-success" />
                  <span className="text-lg font-bold">{completionRate}%</span>
                </div>
                <p className="text-xs text-muted-foreground">Taux completion</p>
              </div>
            </div>
          </div>

          {/* Pie Chart - Répartition des statuts */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-center">Répartition des SAV</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    formatter={(value, name) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Légende personnalisée */}
            <div className="grid grid-cols-2 gap-1 text-xs">
              {statusData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
            
            {/* Satisfaction client */}
            <div className="text-center pt-2 border-t">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-xl font-bold text-success">{customerSatisfaction}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Satisfaction client</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};