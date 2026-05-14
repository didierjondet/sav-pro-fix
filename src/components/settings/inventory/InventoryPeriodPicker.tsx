import { useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, subMonths, subYears,
} from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export type PeriodPreset =
  | 'current_month' | 'current_quarter' | 'current_year'
  | 'last_12_months' | 'last_year' | 'all' | 'custom';

export interface PeriodRange {
  preset: PeriodPreset;
  from: Date | null;
  to: Date | null;
}

export const DEFAULT_PERIOD: PeriodRange = (() => {
  const now = new Date();
  return { preset: 'current_year', from: startOfYear(now), to: endOfYear(now) };
})();

export function resolvePeriod(preset: PeriodPreset, customFrom?: Date | null, customTo?: Date | null): PeriodRange {
  const now = new Date();
  switch (preset) {
    case 'current_month':   return { preset, from: startOfMonth(now), to: endOfMonth(now) };
    case 'current_quarter': return { preset, from: startOfQuarter(now), to: endOfQuarter(now) };
    case 'current_year':    return { preset, from: startOfYear(now), to: endOfYear(now) };
    case 'last_12_months':  return { preset, from: subMonths(now, 12), to: now };
    case 'last_year': {
      const ly = subYears(now, 1);
      return { preset, from: startOfYear(ly), to: endOfYear(ly) };
    }
    case 'all':    return { preset, from: null, to: null };
    case 'custom': return { preset, from: customFrom ?? null, to: customTo ?? null };
  }
}

export function isInPeriod(date: Date | string | null | undefined, period: PeriodRange): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (period.from && d < period.from) return false;
  if (period.to && d > period.to) return false;
  return true;
}

interface Props {
  value: PeriodRange;
  onChange: (next: PeriodRange) => void;
  className?: string;
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  current_month: 'Mois en cours',
  current_quarter: 'Trimestre en cours',
  current_year: 'Année en cours',
  last_12_months: '12 derniers mois',
  last_year: 'Année précédente',
  all: 'Toutes périodes',
  custom: 'Personnalisé',
};

function toInputDate(d: Date | null) {
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function InventoryPeriodPicker({ value, onChange, className }: Props) {
  const isCustom = value.preset === 'custom';
  const fromStr = useMemo(() => toInputDate(value.from), [value.from]);
  const toStr = useMemo(() => toInputDate(value.to), [value.to]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      <Select
        value={value.preset}
        onValueChange={(v: PeriodPreset) => onChange(resolvePeriod(v, value.from, value.to))}
      >
        <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {(Object.keys(PRESET_LABELS) as PeriodPreset[]).map((p) => (
            <SelectItem key={p} value={p}>{PRESET_LABELS[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isCustom && (
        <>
          <Input
            type="date"
            value={fromStr}
            className="h-9 w-[150px]"
            onChange={(e) => onChange({ ...value, from: e.target.value ? new Date(e.target.value) : null })}
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date"
            value={toStr}
            className="h-9 w-[150px]"
            onChange={(e) => onChange({ ...value, to: e.target.value ? new Date(`${e.target.value}T23:59:59`) : null })}
          />
        </>
      )}
    </div>
  );
}
