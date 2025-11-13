import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Package, Activity } from 'lucide-react';
import { useCustomWidgetData } from '@/hooks/useCustomWidgetData';

interface CustomWidgetRendererProps {
  config: any;
}

export const CustomWidgetRenderer = ({ config }: CustomWidgetRendererProps) => {
  const { data, loading } = useCustomWidgetData({
    metrics: config.data_config?.metrics || [],
    filters: config.data_config?.filters,
    groupBy: config.data_config?.groupBy
  });

  const getIcon = () => {
    const iconName = config.display_config?.icon;
    const iconClass = "h-5 w-5";
    switch (iconName) {
      case 'TrendingUp':
        return <TrendingUp className={iconClass} />;
      case 'Package':
        return <Package className={iconClass} />;
      case 'Activity':
        return <Activity className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getIcon()}
            {config.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm font-medium">Aucune donnée disponible</p>
              <p className="text-xs mt-2">
                Le widget s'affichera dès que des données seront collectées
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // KPI Widget
  if (config.widget_type === 'kpi') {
    const metricKey = config.data_config?.metrics?.[0];
    const value = data && data[0] && metricKey ? data[0][metricKey] : 0;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getIcon()}
            {config.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold" style={{ color: config.display_config?.color || 'hsl(var(--primary))' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {config.description && (
            <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
          )}
          {(!data || data.length === 0) && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Aucune donnée pour la période actuelle
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Chart Widget
  if (config.widget_type === 'chart') {
    const displayConfig = config.display_config || {};
    const xAxisKey = displayConfig.xAxis?.key || 'name';
    const lines = displayConfig.lines || [];
    
    const dataKeys = lines.length > 0 
      ? lines 
      : Object.keys(data[0] || {}).filter(key => key !== xAxisKey).map(key => ({
          key,
          label: key,
          color: 'hsl(var(--primary))'
        }));
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{config.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            {config.chart_type === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xAxisKey} label={displayConfig.xAxisLabel ? { value: displayConfig.xAxisLabel, position: 'insideBottom', offset: -5 } : undefined} />
                <YAxis label={displayConfig.yAxisLabel ? { value: displayConfig.yAxisLabel, angle: -90, position: 'insideLeft' } : undefined} />
                <Tooltip />
                <Legend />
                {dataKeys.map((line: any, idx: number) => (
                  <Line 
                    key={line.key}
                    type="monotone" 
                    dataKey={line.key}
                    name={line.label || line.key}
                    stroke={line.color || `hsl(var(--chart-${idx + 1}))`}
                  />
                ))}
              </LineChart>
            ) : config.chart_type === 'bar' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xAxisKey} label={displayConfig.xAxisLabel ? { value: displayConfig.xAxisLabel, position: 'insideBottom', offset: -5 } : undefined} />
                <YAxis label={displayConfig.yAxisLabel ? { value: displayConfig.yAxisLabel, angle: -90, position: 'insideLeft' } : undefined} />
                <Tooltip />
                <Legend />
                {dataKeys.map((line: any, idx: number) => (
                  <Bar 
                    key={line.key}
                    dataKey={line.key}
                    name={line.label || line.key}
                    fill={line.color || `hsl(var(--chart-${idx + 1}))`}
                  />
                ))}
              </BarChart>
            ) : config.chart_type === 'pie' ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey={dataKeys[0]?.key || 'value'}
                  nameKey={xAxisKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {data.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : config.chart_type === 'area' ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xAxisKey} label={displayConfig.xAxisLabel ? { value: displayConfig.xAxisLabel, position: 'insideBottom', offset: -5 } : undefined} />
                <YAxis label={displayConfig.yAxisLabel ? { value: displayConfig.yAxisLabel, angle: -90, position: 'insideLeft' } : undefined} />
                <Tooltip />
                <Legend />
                {dataKeys.map((line: any, idx: number) => (
                  <Area 
                    key={line.key}
                    type="monotone" 
                    dataKey={line.key}
                    name={line.label || line.key}
                    stroke={line.color || `hsl(var(--chart-${idx + 1}))`}
                    fill={line.color || `hsl(var(--chart-${idx + 1}))`}
                    fillOpacity={0.3}
                  />
                ))}
              </AreaChart>
            ) : (
              <div className="text-sm text-muted-foreground">Type de graphique non supporté</div>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  // Table Widget
  if (config.widget_type === 'table') {
    const columns = Object.keys(data[0] || {});
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{config.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {columns.map((col) => (
                    <th key={col} className="text-left p-2 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((row: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    {columns.map((col) => (
                      <td key={col} className="p-2">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{config.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Type de widget non supporté</p>
      </CardContent>
    </Card>
  );
};