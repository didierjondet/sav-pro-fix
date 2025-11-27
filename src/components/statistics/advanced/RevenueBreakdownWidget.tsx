import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Wrench, Phone, Users } from 'lucide-react';

interface RevenueSource {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon?: React.ReactNode;
}

interface ServiceTypeRevenue {
  type: string;
  revenue: number;
  count: number;
  averageValue: number;
}

interface RevenueBreakdownWidgetProps {
  revenueSources: RevenueSource[];
  serviceTypes: ServiceTypeRevenue[];
  totalRevenue: number;
  topService: string;
}

export const RevenueBreakdownWidget = ({
  revenueSources,
  serviceTypes,
  totalRevenue,
  topService
}: RevenueBreakdownWidgetProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(Math.round(value || 0));

  const chartConfig = {
    revenue: { label: "Chiffre d'affaires", color: "hsl(var(--primary))" }
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
        {`${Math.round(percent * 100)}%`}
      </text>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Répartition du chiffre d'affaires
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Indicateur principal */}
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
            <p className="text-sm text-muted-foreground">Chiffre d'affaires total</p>
            <div className="mt-2">
              <span className="text-sm font-medium text-success">Service principal: {topService}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Graphique en secteurs - Sources de revenus */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-center">Sources de revenus</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueSources}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      formatter={(value, name) => [formatCurrency(value as number), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Légende des sources */}
              <div className="space-y-2">
                {revenueSources.map((source, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="flex items-center gap-1">
                        {source.icon}
                        {source.name}
                      </span>
                    </div>
                    <span className="font-medium">{Math.round(source.percentage)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Graphique en barres - Types de services */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-center">Revenus par type de service</h4>
              <div className="h-48">
                <ChartContainer config={chartConfig} className="h-full">
                  <BarChart data={serviceTypes}>
                    <XAxis 
                      dataKey="type" 
                      tickLine={false} 
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      className="text-xs"
                    />
                    <YAxis 
                      tickFormatter={(v) => `${Math.round(v/1000)}k€`}
                      tickLine={false} 
                      axisLine={false}
                      className="text-xs"
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="var(--color-revenue)" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>

          {/* Détails des types de services */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Détail par type de service</h4>
            {serviceTypes.map((service, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {service.type === 'Réparation' && <Wrench className="h-4 w-4" />}
                    {service.type === 'Remplacement' && <Phone className="h-4 w-4" />}
                    {service.type === 'Diagnostic' && <Users className="h-4 w-4" />}
                    {service.type}
                  </span>
                  <div className="text-right text-sm">
                    <div className="font-medium">{formatCurrency(service.revenue)}</div>
                    <div className="text-xs text-muted-foreground">
                      {service.count} SAV • Moy: {formatCurrency(service.averageValue)}
                    </div>
                  </div>
                </div>
                <Progress 
                  value={(service.revenue / totalRevenue) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};