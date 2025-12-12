import { useMonthlyLateRate } from '@/hooks/useMonthlyLateRate';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, TooltipProps } from 'recharts';
import { Loader2 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-semibold capitalize">{data.monthLabel} {new Date().getFullYear()}</p>
        <div className="border-t my-2" />
        <p className="text-sm">
          <span className="text-muted-foreground">Taux de retard: </span>
          <span className="font-medium text-destructive">{data.lateRate}%</span>
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">SAV en retard: </span>
          <span className="font-medium">{data.lateCount} / {data.totalCount}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function MonthlyLateRateChart() {
  const { data, loading, year } = useMonthlyLateRate();

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-muted-foreground">
        Aucune donnée disponible pour {year}
      </div>
    );
  }

  return (
    <ChartContainer
      config={{ lateRate: { label: "Taux de retard (%)", color: "hsl(var(--destructive))" } }}
      className="h-72"
    >
      <LineChart data={data}>
        <XAxis 
          dataKey="monthLabel" 
          tickLine={false} 
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          domain={[0, 100]} 
          tickFormatter={(v) => `${Math.round(v)}%`} 
          tickLine={false} 
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip content={<CustomTooltip />} />
        <Line 
          type="monotone" 
          dataKey="lateRate" 
          stroke="var(--color-lateRate)" 
          strokeWidth={2} 
          dot={{ fill: "var(--color-lateRate)", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
