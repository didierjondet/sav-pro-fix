import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useShop } from '@/hooks/useShop';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FileX, TrendingDown } from 'lucide-react';

const REJECTION_LABELS: Record<string, string> = {
  too_expensive: 'Trop cher',
  too_slow: 'Trop lent',
  no_trust: 'Pas confiance',
  postponed: 'Reporté'
};

const REJECTION_COLORS: Record<string, string> = {
  too_expensive: '#ef4444',
  too_slow: '#f97316',
  no_trust: '#8b5cf6',
  postponed: '#3b82f6'
};

interface RejectionStats {
  too_expensive: number;
  too_slow: number;
  no_trust: number;
  postponed: number;
  total: number;
}

export function QuoteRejectionWidget() {
  const { shop } = useShop();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['quote-rejections', shop?.id],
    queryFn: async (): Promise<RejectionStats> => {
      if (!shop?.id) return { too_expensive: 0, too_slow: 0, no_trust: 0, postponed: 0, total: 0 };

      const { data, error } = await supabase
        .from('quotes')
        .select('rejection_reason')
        .eq('shop_id', shop.id)
        .eq('status', 'rejected')
        .not('rejection_reason', 'is', null);

      if (error) {
        console.error('Error fetching rejection stats:', error);
        return { too_expensive: 0, too_slow: 0, no_trust: 0, postponed: 0, total: 0 };
      }

      const counts: RejectionStats = {
        too_expensive: 0,
        too_slow: 0,
        no_trust: 0,
        postponed: 0,
        total: 0
      };

      data?.forEach(q => {
        if (q.rejection_reason && q.rejection_reason in counts) {
          counts[q.rejection_reason as keyof Omit<RejectionStats, 'total'>]++;
          counts.total++;
        }
      });

      return counts;
    },
    enabled: !!shop?.id
  });

  const chartData = stats ? [
    { name: REJECTION_LABELS.too_expensive, value: stats.too_expensive, key: 'too_expensive' },
    { name: REJECTION_LABELS.too_slow, value: stats.too_slow, key: 'too_slow' },
    { name: REJECTION_LABELS.no_trust, value: stats.no_trust, key: 'no_trust' },
    { name: REJECTION_LABELS.postponed, value: stats.postponed, key: 'postponed' }
  ].filter(d => d.value > 0) : [];

  const hasData = chartData.length > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileX className="h-4 w-4 text-destructive" />
          Raisons de refus des devis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <TrendingDown className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Aucun devis refusé</p>
            <p className="text-xs">Les statistiques apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-4">
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
                    {chartData.map((entry) => (
                      <Cell 
                        key={entry.key} 
                        fill={REJECTION_COLORS[entry.key]} 
                      />
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
            
            <div className="text-center text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{stats?.total || 0}</span> devis refusés au total
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}