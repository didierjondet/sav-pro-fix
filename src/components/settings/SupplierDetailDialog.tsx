import { useMemo, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Printer, TrendingUp, TrendingDown, Package, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { Supplier } from '@/hooks/useSuppliersDirectory';
import { useSupplierStatistics } from '@/hooks/useSupplierStatistics';

type PeriodKey = 'month' | 'quarter' | 'semester' | 'year' | 'custom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', '#f59e0b', '#ef4444', '#94a3b8'];

function fmtEUR(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => {
    if (suffix === '€') return fmtEUR(v);
    if (suffix === '%') return `${v.toFixed(1)}%`;
    return Math.round(v).toLocaleString('fr-FR');
  });
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: 'easeOut' });
    return controls.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

export function SupplierDetailDialog({ open, onOpenChange, supplier }: Props) {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);

  const range = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'month': return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'quarter': return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case 'semester': {
        const m = now.getMonth();
        const from = m < 6 ? new Date(now.getFullYear(), 0, 1) : new Date(now.getFullYear(), 6, 1);
        const to = m < 6 ? new Date(now.getFullYear(), 5, 30, 23, 59, 59) : new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        return { from, to };
      }
      case 'year': return { from: startOfYear(now), to: endOfYear(now) };
      case 'custom': return {
        from: customFrom ?? subMonths(now, 1),
        to: customTo ?? now,
      };
    }
  }, [period, customFrom, customTo]);

  const { totals, monthly, byPart, isLoading } = useSupplierStatistics(supplier?.id, range.from, range.to);

  const pieData = useMemo(() => {
    if (byPart.length <= 5) return byPart.map(p => ({ name: p.part_name, value: p.expenses }));
    const top = byPart.slice(0, 5).map(p => ({ name: p.part_name, value: p.expenses }));
    const rest = byPart.slice(5).reduce((s, p) => s + p.expenses, 0);
    return [...top, { name: 'Autres', value: rest }];
  }, [byPart]);

  const periodLabel = `${format(range.from, 'd MMM yyyy', { locale: fr })} → ${format(range.to, 'd MMM yyyy', { locale: fr })}`;

  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const handlePrint = () => {
    if (!supplier) return;
    const w = window.open('', '_blank', 'width=1000,height=900');
    if (!w) return;
    const partsRows = byPart.map(p => `
      <tr>
        <td>${escapeHtml(p.part_name)}</td>
        <td class="right">${p.quantity}</td>
        <td class="right">${escapeHtml(fmtEUR(p.expenses))}</td>
        <td class="right">${escapeHtml(fmtEUR(p.revenue))}</td>
        <td class="right ${p.margin >= 0 ? 'green' : 'red'}">${escapeHtml(fmtEUR(p.margin))}</td>
      </tr>`).join('');
    const monthlyRows = monthly.map(m => `
      <tr>
        <td>${escapeHtml(m.label)}</td>
        <td class="right">${escapeHtml(fmtEUR(m.expenses))}</td>
        <td class="right">${escapeHtml(fmtEUR(m.revenue))}</td>
        <td class="right ${m.margin >= 0 ? 'green' : 'red'}">${escapeHtml(fmtEUR(m.margin))}</td>
      </tr>`).join('');
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
      <title>Rapport fournisseur - ${escapeHtml(supplier.name)}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: Arial, sans-serif; color:#111827; font-size: 11px; margin:0; padding:16px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .sub { color:#6b7280; margin-bottom: 14px; font-size: 11px; }
        .kpis { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin: 12px 0 18px; }
        .kpi { border:1px solid #d1d5db; border-radius:6px; padding:8px 10px; }
        .kpi .l { font-size:10px; text-transform:uppercase; color:#6b7280; }
        .kpi .v { font-size:16px; font-weight:700; margin-top:2px; }
        h2 { font-size: 13px; margin: 16px 0 6px; border-bottom:1px solid #e5e7eb; padding-bottom:4px; }
        table { width:100%; border-collapse:collapse; }
        th, td { border:1px solid #e5e7eb; padding:5px 7px; text-align:left; }
        th { background:#f3f4f6; }
        .right { text-align:right; }
        .green { color:#16a34a; } .red { color:#dc2626; }
        @media print { body { padding:0; } }
      </style></head><body>
      <h1>${escapeHtml(supplier.name)}</h1>
      <div class="sub">Rapport fournisseur · ${escapeHtml(periodLabel)} · Édité le ${escapeHtml(new Date().toLocaleString('fr-FR'))}</div>
      <div class="kpis">
        <div class="kpi"><div class="l">Total achats</div><div class="v">${escapeHtml(fmtEUR(totals.expenses))}</div></div>
        <div class="kpi"><div class="l">CA généré</div><div class="v">${escapeHtml(fmtEUR(totals.revenue))}</div></div>
        <div class="kpi"><div class="l">Marge</div><div class="v ${totals.margin >= 0 ? 'green' : 'red'}">${escapeHtml(fmtEUR(totals.margin))}</div></div>
        <div class="kpi"><div class="l">Marge %</div><div class="v">${totals.margin_pct.toFixed(1)}%</div></div>
      </div>
      <h2>Évolution mensuelle</h2>
      <table><thead><tr><th>Mois</th><th class="right">Achats</th><th class="right">CA</th><th class="right">Marge</th></tr></thead>
        <tbody>${monthlyRows || '<tr><td colspan="4" style="text-align:center;color:#6b7280">Aucune donnée</td></tr>'}</tbody></table>
      <h2>Détail par pièce</h2>
      <table><thead><tr><th>Pièce</th><th class="right">Qté</th><th class="right">Achats</th><th class="right">CA</th><th class="right">Marge</th></tr></thead>
        <tbody>${partsRows || '<tr><td colspan="5" style="text-align:center;color:#6b7280">Aucune donnée</td></tr>'}</tbody></table>
      <script>window.onload=()=>setTimeout(()=>window.print(),200);</script>
    </body></html>`);
    w.document.close();
  };

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {supplier.name}
                <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                  {supplier.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </DialogTitle>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                {supplier.contact_name && <span>{supplier.contact_name}</span>}
                {supplier.email && <span>{supplier.email}</span>}
                {supplier.phone && <span>{supplier.phone}</span>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Imprimer
            </Button>
          </div>
        </DialogHeader>

        {/* Filtres */}
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <TabsList>
              <TabsTrigger value="month">Mois</TabsTrigger>
              <TabsTrigger value="quarter">Trimestre</TabsTrigger>
              <TabsTrigger value="semester">Semestre</TabsTrigger>
              <TabsTrigger value="year">Année</TabsTrigger>
              <TabsTrigger value="custom">Personnalisé</TabsTrigger>
            </TabsList>
          </Tabs>
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!customFrom && 'text-muted-foreground')}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {customFrom ? format(customFrom, 'dd/MM/yyyy') : 'Début'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(!customTo && 'text-muted-foreground')}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {customTo ? format(customTo, 'dd/MM/yyyy') : 'Fin'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className="text-xs text-muted-foreground ml-auto">{periodLabel}</div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total achats', value: totals.expenses, icon: Receipt, color: 'text-orange-500', suffix: '€' },
            { label: 'CA généré', value: totals.revenue, icon: TrendingUp, color: 'text-blue-500', suffix: '€' },
            { label: 'Marge', value: totals.margin, icon: totals.margin >= 0 ? TrendingUp : TrendingDown, color: totals.margin >= 0 ? 'text-green-500' : 'text-red-500', suffix: '€' },
            { label: 'Marge %', value: totals.margin_pct, icon: Package, color: 'text-purple-500', suffix: '%' },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{kpi.label}</span>
                      <Icon className={cn('h-4 w-4', kpi.color)} />
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      <AnimatedNumber value={kpi.value} suffix={kpi.suffix} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {totals.sav_count} SAV · {totals.parts_count} pièces
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Évolution mensuelle</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v)}€`} />
                  <Tooltip formatter={(v: number) => fmtEUR(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="expenses" name="Achats" stroke="#f97316" fill="url(#exp)" animationDuration={800} />
                  <Area type="monotone" dataKey="revenue" name="CA" stroke="#3b82f6" fill="url(#rev)" animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Marge mensuelle</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v)}€`} />
                  <Tooltip formatter={(v: number) => fmtEUR(v)} />
                  <Bar dataKey="margin" name="Marge" animationDuration={800}>
                    {monthly.map((m, idx) => (
                      <Cell key={idx} fill={m.margin >= 0 ? '#16a34a' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Répartition des achats par pièce</CardTitle></CardHeader>
            <CardContent className="h-64">
              {pieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Aucune donnée sur la période
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} animationDuration={800} label={(e: any) => e.name}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtEUR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tableau détaillé */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Détail par pièce</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>
            ) : byPart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune pièce sur la période.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pièce</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">Achats</TableHead>
                      <TableHead className="text-right">CA</TableHead>
                      <TableHead className="text-right">Marge</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byPart.map((p) => (
                      <TableRow key={p.part_name}>
                        <TableCell className="font-medium">{p.part_name}</TableCell>
                        <TableCell className="text-right">{p.quantity}</TableCell>
                        <TableCell className="text-right">{fmtEUR(p.expenses)}</TableCell>
                        <TableCell className="text-right">{fmtEUR(p.revenue)}</TableCell>
                        <TableCell className={cn('text-right font-medium', p.margin >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {fmtEUR(p.margin)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
