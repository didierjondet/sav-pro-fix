import { useMonthlyLateRate } from '@/hooks/useMonthlyLateRate';
import { useLateRateChart } from '@/hooks/useLateRateChart';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, TooltipProps } from 'recharts';
import { Loader2 } from 'lucide-react';

interface MonthlyLateRateChartProps {
  /** Mode "rapport annuel" : affiche les 12 mois d'une année. */
  year?: number;
  /** Mode "widget" : utilise la configuration (temporalité + filtres) du widget. */
  widgetId?: string;
}

const CustomTooltip = ({ active, payload, suffix }: TooltipProps<number, string> & { suffix?: string }) => {
  if (active && payload && payload.length) {
    const data: any = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-semibold capitalize">{data.label ?? data.monthLabel}{suffix ? ` ${suffix}` : ''}</p>
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

export function MonthlyLateRateChart({ year, widgetId }: MonthlyLateRateChartProps) {
  // Mode widget : respecte la configuration (temporalité + filtres)
  if (widgetId) {
    return <WidgetModeChart widgetId={widgetId} />;
  }
  // Mode rapport annuel (inchangé)
  return <YearModeChart year={year} />;
}

function WidgetModeChart({ widgetId }: { widgetId: string }) {
  const { data, loading } = useLateRateChart(widgetId);

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data.length || data.every((d) => d.totalCount === 0)) {
    return (
      <div className="h-72 flex items-center justify-center text-muted-foreground">
        Aucune donnée disponible sur la période sélectionnée
      </div>
    );
  }

  // Agrégat global sur la période (identique au KPI "Taux de retard")
  const totalLate = data.reduce((s, b) => s + b.lateCount, 0);
  const totalCount = data.reduce((s, b) => s + b.totalCount, 0);
  const globalRate = totalCount > 0 ? Math.round((totalLate / totalCount) * 1000) / 10 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <div className="text-xs text-muted-foreground">Taux global sur la période</div>
        <div className="text-sm font-semibold text-destructive">
          {globalRate.toFixed(1).replace('.', ',')}%
          <span className="ml-1 text-xs text-muted-foreground font-normal">
            ({totalLate}/{totalCount})
          </span>
        </div>
      </div>
      <ChartContainer
        config={{ lateRate: { label: 'Taux de retard (%)', color: 'hsl(var(--destructive))' } }}
        className="h-72"
      >
        <LineChart data={data}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${Math.round(v)}%`} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <ChartTooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="lateRate"
            stroke="var(--color-lateRate)"
            strokeWidth={2}
            dot={{ fill: 'var(--color-lateRate)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function YearModeChart({ year }: { year?: number }) {
  const { data, loading, year: displayYear } = useMonthlyLateRate(year);

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
        Aucune donnée disponible pour {displayYear}
      </div>
    );
  }

  return (
    <ChartContainer
      config={{ lateRate: { label: 'Taux de retard (%)', color: 'hsl(var(--destructive))' } }}
      className="h-72"
    >
      <LineChart data={data}>
        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${Math.round(v)}%`} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<CustomTooltip suffix={String(displayYear)} />} />
        <Line
          type="monotone"
          dataKey="lateRate"
          stroke="var(--color-lateRate)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-lateRate)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
