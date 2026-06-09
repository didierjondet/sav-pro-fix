import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useShop } from '@/hooks/useShop';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FileCheck2, TrendingUp } from 'lucide-react';

interface ConversionStats {
  transformed: number;
  rejected: number;
  pending: number;
  total: number;
  totalAmountTransformed: number;
  totalAmountAll: number;
}

interface QuoteConversionWidgetProps {
  dateRange?: { start: Date; end: Date };
}

export function QuoteConversionWidget({ dateRange }: QuoteConversionWidgetProps) {
  const { shop } = useShop();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['quote-conversion', shop?.id, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async (): Promise<ConversionStats> => {
      const empty: ConversionStats = { transformed: 0, rejected: 0, pending: 0, total: 0, totalAmountTransformed: 0, totalAmountAll: 0 };
      if (!shop?.id) return empty;

      let query = supabase
        .from('quotes')
        .select('id, status, sav_case_id, accepted_at, rejected_at, total_amount')
        .eq('shop_id', shop.id);

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error || !data) return empty;

      const counts = { ...empty };
      data.forEach((q: any) => {
        counts.total++;
        const amount = Number(q.total_amount) || 0;
        counts.totalAmountAll += amount;
        const isTransformed = !!q.sav_case_id || !!q.accepted_at || q.status === 'accepted';
        const isRejected = !!q.rejected_at || q.status === 'rejected';
        if (isTransformed) {
          counts.transformed++;
          counts.totalAmountTransformed += amount;
        } else if (isRejected) {
          counts.rejected++;
        } else {
          counts.pending++;
        }
      });
      return counts;
    },
    enabled: !!shop?.id
  });

  const conversionRate = stats && stats.total > 0
    ? Math.round((stats.transformed / stats.total) * 100)
    : 0;

  const chartData = stats ? [
    { name: 'Transformés', value: stats.transformed, color: 'hsl(var(--success))' },
    { name: 'Refusés', value: stats.rejected, color: 'hsl(var(--destructive))' },
    { name: 'En attente', value: stats.pending, color: 'hsl(var(--muted-foreground))' }
  ].filter(d => d.value > 0) : [];

  const hasData = !!stats && stats.total > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-success" />
          Taux de transformation des devis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Aucun devis sur la période</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-2xl font-bold text-success">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Taux conversion</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-2xl font-bold">{stats?.transformed || 0}</p>
                <p className="text-xs text-muted-foreground">Transformés</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Devis émis</p>
              </div>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} devis (${stats?.total ? Math.round((value / stats.total) * 100) : 0}%)`,
                      name
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground border-t pt-2">
              <span>CA transformé</span>
              <span className="font-medium text-foreground">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats?.totalAmountTransformed || 0)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
