import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Package, Activity } from 'lucide-react';

interface CustomWidgetRendererProps {
  config: any;
}

interface FilterConfig {
  column: string;
  operator: string;
  value: string;
}

export const CustomWidgetRenderer = ({ config }: CustomWidgetRendererProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { shop } = useShop();

  useEffect(() => {
    if (!shop?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const dataConfig = config.data_config;
        let query = supabase.from(dataConfig.table).select(dataConfig.select || '*');

        // Apply filters
        const filters = dataConfig.filters as FilterConfig[] | undefined;
        if (filters && Array.isArray(filters)) {
          for (const filter of filters) {
            const value = filter.value === '{shop_id}' ? shop.id : filter.value;
            query = query.eq(filter.column, value);
          }
        }

        // Apply ordering
        if (dataConfig.orderBy) {
          query = query.order(dataConfig.orderBy, { ascending: dataConfig.ascending ?? true });
        }

        // Apply limit
        if (dataConfig.limit) {
          query = query.limit(dataConfig.limit);
        }

        const { data: result, error } = await query;

        if (error) {
          console.error('Error fetching custom widget data:', error);
          setData(null);
        } else {
          setData(result);
        }
      } catch (error) {
        console.error('Error in custom widget renderer:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config, shop?.id]);

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
          <CardTitle className="text-base">{config.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    );
  }

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

  // KPI Widget
  if (config.widget_type === 'kpi') {
    const value = data[0]?.total ?? data.length;
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
        </CardContent>
      </Card>
    );
  }

  // Chart Widget
  if (config.widget_type === 'chart') {
    const chartColor = config.display_config?.color || 'hsl(var(--primary))';
    const showLegend = config.display_config?.showLegend ?? false;
    const showLabels = config.display_config?.showLabels ?? false;
    
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
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                {showLegend && <Legend />}
                <Line type="monotone" dataKey="value" stroke={chartColor} />
              </LineChart>
            ) : config.chart_type === 'bar' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                {showLegend && <Legend />}
                <Bar dataKey="value" fill={chartColor} />
              </BarChart>
            ) : config.chart_type === 'pie' ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={showLabels}
                >
                  {data.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${Math.max(0.2, 1 - index * 0.2)})`} />
                  ))}
                </Pie>
              </PieChart>
            ) : config.chart_type === 'area' ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                {showLegend && <Legend />}
                <Area type="monotone" dataKey="value" stroke={chartColor} fill={chartColor} fillOpacity={0.3} />
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