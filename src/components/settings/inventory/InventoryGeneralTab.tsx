import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, ChevronDown, ClipboardList, History, TrendingUp,
  Printer, Search, Filter, BarChart3, FileText, AlertTriangle,
} from 'lucide-react';
import { InventoryJournalDialog } from './InventoryJournalDialog';
import { InventoryPeriodPicker, DEFAULT_PERIOD, isInPeriod, type PeriodRange } from './InventoryPeriodPicker';
import { InventoryPrintDialog } from './InventoryPrintDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  Bar, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval,
  format, differenceInDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  INVENTORY_MODE_LABELS, INVENTORY_STATUS_LABELS,
  type InventoryAuditLog, type InventoryMode, type InventorySession,
} from './types';

function currency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(value || 0);
}

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  in_progress: 'default', paused: 'secondary', applied: 'outline',
  cancelled: 'destructive', completed: 'secondary', draft: 'outline',
};

const ACTION_LABELS: Record<string, string> = {
  session_paused: 'Pause', session_resumed: 'Reprise', session_stopped: 'Arrêt',
  session_completed: 'Clôture', session_cancelled: 'Annulation',
  session_applied: 'Application stock', item_updated: 'Ligne modifiée', bulk_scan: 'Lot de scan',
};

interface Props {
  sessions: InventorySession[];
  shopId: string | undefined;
  onOpenSession: (sessionId: string) => void;
  onCreate: () => void;
  focusedSessionId?: string | null;
  onFocusedHandled?: () => void;
}

export function InventoryGeneralTab({ sessions, shopId, onOpenSession, onCreate, focusedSessionId, onFocusedHandled }: Props) {
  // ---------- Sessions partitionnées ----------
  const ongoing = useMemo(
    () => sessions.filter((s) => s.status === 'in_progress' || s.status === 'paused' || s.status === 'completed'),
    [sessions],
  );
  const closed = useMemo(
    () => sessions.filter((s) => s.status === 'applied' || s.status === 'cancelled'),
    [sessions],
  );
  const validated = useMemo(() => sessions.filter((s) => s.status === 'applied'), [sessions]);

  const refDate = (s: InventorySession) => new Date(s.applied_at || s.completed_at || s.created_at);

  // ---------- Synthèse : période ----------
  const [synthPeriod, setSynthPeriod] = useState<PeriodRange>(DEFAULT_PERIOD);
  const validatedInPeriod = useMemo(
    () => validated.filter((s) => isInPeriod(refDate(s), synthPeriod)),
    [validated, synthPeriod],
  );

  const totals = useMemo(() => {
    const totalVariance = validatedInPeriod.reduce((sum, s) => sum + (s.variance_total_cost || 0), 0);
    const totalMissing = validatedInPeriod.reduce((sum, s) => sum + (s.missing_total_cost || 0), 0);
    const avgCompletion = validatedInPeriod.length
      ? validatedInPeriod.reduce((sum, s) => sum + (s.total_items ? s.counted_items / s.total_items : 0), 0) / validatedInPeriod.length
      : 0;
    return {
      totalVariance, totalMissing,
      avgCompletion: Math.round(avgCompletion * 100),
      count: validatedInPeriod.length,
    };
  }, [validatedInPeriod]);

  // ---------- Graphique adaptatif ----------
  const chartData = useMemo(() => {
    if (!validatedInPeriod.length) return [];
    const dates = validatedInPeriod.map(refDate);
    const from = synthPeriod.from ?? new Date(Math.min(...dates.map((d) => d.getTime())));
    const to = synthPeriod.to ?? new Date(Math.max(...dates.map((d) => d.getTime())));
    if (from > to) return [];
    const span = differenceInDays(to, from);
    let buckets: Date[] = [];
    let granularity: 'day' | 'week' | 'month' = 'month';
    if (span <= 31) { buckets = eachDayOfInterval({ start: from, end: to }); granularity = 'day'; }
    else if (span <= 120) { buckets = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 }); granularity = 'week'; }
    else { buckets = eachMonthOfInterval({ start: from, end: to }); granularity = 'month'; }

    const keyFor = (d: Date) => {
      if (granularity === 'day') return format(d, 'yyyy-MM-dd');
      if (granularity === 'week') {
        const day = new Date(d); day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
        return format(day, 'yyyy-MM-dd');
      }
      return format(d, 'yyyy-MM');
    };
    const labelFor = (d: Date) => {
      if (granularity === 'day') return format(d, 'd MMM', { locale: fr });
      if (granularity === 'week') return `S${format(d, 'I', { locale: fr })}`;
      return format(d, 'MMM yy', { locale: fr });
    };

    const map = new Map<string, { label: string; count: number; variance: number; missing: number }>();
    buckets.forEach((b) => map.set(keyFor(b), { label: labelFor(b), count: 0, variance: 0, missing: 0 }));
    validatedInPeriod.forEach((s) => {
      const k = keyFor(refDate(s));
      const e = map.get(k);
      if (e) {
        e.count += 1;
        e.variance += s.variance_total_cost || 0;
        e.missing += s.missing_total_cost || 0;
      }
    });
    return Array.from(map.values());
  }, [validatedInPeriod, synthPeriod]);

  // ---------- Logs globaux ----------
  const logsQuery = useQuery({
    queryKey: ['inventory-logs-global', shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_audit_logs')
        .select('*')
        .eq('shop_id', shopId as string)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as unknown as InventoryAuditLog[];
    },
  });

  const sessionNameById = useMemo(() => {
    const m = new Map<string, string>();
    sessions.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [sessions]);

  const logsBySession = useMemo(() => {
    const map = new Map<string, InventoryAuditLog[]>();
    (logsQuery.data ?? []).forEach((l) => {
      const arr = map.get(l.inventory_session_id) ?? [];
      arr.push(l); map.set(l.inventory_session_id, arr);
    });
    return map;
  }, [logsQuery.data]);

  // ---------- Dialogs ----------
  const [globalLogOpen, setGlobalLogOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printPreselect, setPrintPreselect] = useState<string[] | undefined>(undefined);

  // ---------- Historique : filtres + sélection ----------
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'applied' | 'cancelled'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | InventoryMode>('all');
  const [histPeriod, setHistPeriod] = useState<PeriodRange>({ preset: 'all', from: null, to: null });
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'variance' | 'name'>('date_desc');
  const [selectedHistIds, setSelectedHistIds] = useState<Set<string>>(new Set());

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = closed.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (modeFilter !== 'all' && s.mode !== modeFilter) return false;
      if (!isInPeriod(refDate(s), histPeriod)) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
    rows = rows.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':  return refDate(a).getTime() - refDate(b).getTime();
        case 'variance':  return Math.abs(b.variance_total_cost || 0) - Math.abs(a.variance_total_cost || 0);
        case 'name':      return a.name.localeCompare(b.name);
        default:          return refDate(b).getTime() - refDate(a).getTime();
      }
    });
    return rows;
  }, [closed, search, statusFilter, modeFilter, histPeriod, sortBy]);

  const toggleHistSelected = (id: string) =>
    setSelectedHistIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const allHistSelected = filteredHistory.length > 0 && filteredHistory.every((s) => selectedHistIds.has(s.id));
  const toggleAllHist = () => {
    if (allHistSelected) {
      setSelectedHistIds((prev) => {
        const n = new Set(prev);
        filteredHistory.forEach((s) => n.delete(s.id));
        return n;
      });
    } else {
      setSelectedHistIds((prev) => {
        const n = new Set(prev);
        filteredHistory.forEach((s) => n.add(s.id));
        return n;
      });
    }
  };

  const openPrintAll = () => { setPrintPreselect(filteredHistory.map((s) => s.id)); setPrintOpen(true); };
  const openPrintSelection = () => { setPrintPreselect(Array.from(selectedHistIds)); setPrintOpen(true); };

  // ---------- Focus depuis lien externe ----------
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const sessionRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  useEffect(() => {
    if (!focusedSessionId) return;
    if (!sessions.some((s) => s.id === focusedSessionId)) return;
    setOpenHistoryId(focusedSessionId);
    requestAnimationFrame(() => {
      const el = sessionRefs.current.get(focusedSessionId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    onFocusedHandled?.();
  }, [focusedSessionId, sessions, onFocusedHandled]);

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Vue générale des inventaires
          </h2>
          <p className="text-sm text-muted-foreground">
            Pilotez vos sessions, filtrez l'historique, imprimez les documents et suivez les écarts validés.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setGlobalLogOpen(true)} variant="outline" size="lg">
            <History className="h-4 w-4" /> Journal log global
          </Button>
          <Button onClick={openPrintAll} variant="outline" size="lg">
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
          <Button onClick={onCreate} variant="destructive" size="lg" className="font-semibold">
            <ClipboardList className="h-4 w-4" /> Lancer un nouvel inventaire
          </Button>
        </div>
      </div>

      <InventoryJournalDialog
        open={globalLogOpen}
        onOpenChange={setGlobalLogOpen}
        title="Journal global des inventaires"
        logs={logsQuery.data ?? []}
        sessionNameById={sessionNameById}
        showSessionColumn
      />

      <InventoryPrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        sessions={closed}
        preselectedIds={printPreselect}
      />

      {/* BLOC 1 — Inventaires en cours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inventaires en cours ou à clôturer</CardTitle>
        </CardHeader>
        <CardContent>
          {ongoing.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucun inventaire ouvert. Lancez-en un pour commencer.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ongoing.map((s) => {
                const ratio = s.total_items ? Math.round((s.counted_items / s.total_items) * 100) : 0;
                const dotColor =
                  s.status === 'in_progress' ? 'bg-success animate-pulse'
                  : s.status === 'paused' ? 'bg-warning'
                  : 'bg-muted-foreground';
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpenSession(s.id)}
                    className="group rounded-lg border p-4 text-left transition-all hover:border-primary hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor}`} />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {INVENTORY_MODE_LABELS[s.mode]} · {new Date(s.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      <Badge variant={statusBadgeVariant[s.status] || 'outline'}>
                        {INVENTORY_STATUS_LABELS[s.status]}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-medium">{ratio}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Comptés:</span> {s.counted_items}/{s.total_items}</div>
                      <div><span className="text-muted-foreground">Manquants:</span> {s.missing_items}</div>
                      <div><span className="text-muted-foreground">Écart:</span> {currency(s.variance_total_cost)}</div>
                    </div>
                    <div className="mt-3 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Ouvrir l'onglet →
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOC 2 — Historique */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Historique des inventaires clôturés
              <Badge variant="outline">{filteredHistory.length}</Badge>
            </CardTitle>
            {selectedHistIds.size > 0 && (
              <Button size="sm" variant="default" onClick={openPrintSelection}>
                <Printer className="h-4 w-4" /> Imprimer la sélection ({selectedHistIds.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Toolbar filtres */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un inventaire…"
                className="h-9 w-[220px] pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: typeof statusFilter) => setStatusFilter(v)}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="applied">Validés</SelectItem>
                <SelectItem value="cancelled">Annulés</SelectItem>
              </SelectContent>
            </Select>
            <Select value={modeFilter} onValueChange={(v: typeof modeFilter) => setModeFilter(v)}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous modes</SelectItem>
                <SelectItem value="assisted">Assisté</SelectItem>
                <SelectItem value="scan">Scan</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>
            <InventoryPeriodPicker value={histPeriod} onChange={setHistPeriod} />
            <Select value={sortBy} onValueChange={(v: typeof sortBy) => setSortBy(v)}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Plus récents</SelectItem>
                <SelectItem value="date_asc">Plus anciens</SelectItem>
                <SelectItem value="variance">Écart le plus important</SelectItem>
                <SelectItem value="name">Nom (A→Z)</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2 text-xs">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <button type="button" className="text-primary hover:underline" onClick={toggleAllHist}>
                {allHistSelected ? 'Tout décocher' : 'Tout cocher'}
              </button>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-50" />
              Aucun inventaire ne correspond aux filtres.
            </div>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <div className="space-y-2">
                {filteredHistory.map((s) => {
                  const isOpen = openHistoryId === s.id;
                  const sessionLogs = logsBySession.get(s.id) ?? [];
                  const checked = selectedHistIds.has(s.id);
                  return (
                    <Collapsible
                      key={s.id}
                      open={isOpen}
                      onOpenChange={(o) => setOpenHistoryId(o ? s.id : null)}
                      className="rounded-md border"
                      ref={(el: HTMLDivElement | null) => { sessionRefs.current.set(s.id, el); }}
                    >
                      <div className="flex items-center gap-2 p-3 hover:bg-muted/50">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleHistSelected(s.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <CollapsibleTrigger className="flex-1 flex items-center justify-between gap-3 text-left">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(s.applied_at || s.completed_at || s.created_at).toLocaleString('fr-FR')}
                              {' · '}{INVENTORY_MODE_LABELS[s.mode]}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-medium ${s.variance_total_cost < 0 ? 'text-destructive' : 'text-success'}`}>
                              Écart : {currency(s.variance_total_cost)}
                            </span>
                            <Badge variant={statusBadgeVariant[s.status] || 'outline'}>
                              {INVENTORY_STATUS_LABELS[s.status]}
                            </Badge>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent className="border-t p-3">
                        <Tabs defaultValue="details">
                          <TabsList>
                            <TabsTrigger value="details">Détails</TabsTrigger>
                            <TabsTrigger value="logs">Logs ({sessionLogs.length})</TabsTrigger>
                          </TabsList>
                          <TabsContent value="details" className="mt-3">
                            <div className="grid gap-2 text-xs sm:grid-cols-2 md:grid-cols-3">
                              <div><span className="text-muted-foreground">Lignes :</span> {s.counted_items}/{s.total_items}</div>
                              <div><span className="text-muted-foreground">Manquants :</span> {s.missing_items}</div>
                              <div><span className="text-muted-foreground">Écart valeur :</span> {currency(s.variance_total_cost)}</div>
                              <div><span className="text-muted-foreground">Valeur manquants :</span> {currency(s.missing_total_cost)}</div>
                              <div><span className="text-muted-foreground">Créé :</span> {new Date(s.created_at).toLocaleDateString('fr-FR')}</div>
                              {s.applied_at && <div><span className="text-muted-foreground">Appliqué :</span> {new Date(s.applied_at).toLocaleDateString('fr-FR')}</div>}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => onOpenSession(s.id)}>
                                Ouvrir la session
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setPrintPreselect([s.id]); setPrintOpen(true); }}>
                                <Printer className="h-3.5 w-3.5" /> Imprimer
                              </Button>
                            </div>
                          </TabsContent>
                          <TabsContent value="logs" className="mt-3">
                            {sessionLogs.length === 0 ? (
                              <div className="text-xs text-muted-foreground py-2">Aucune action.</div>
                            ) : (
                              <div className="space-y-1.5 max-h-[300px] overflow-auto pr-2">
                                {sessionLogs
                                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                  .map((log) => (
                                    <div key={log.id} className="rounded border p-2 text-xs">
                                      <div className="flex items-center justify-between gap-2">
                                        <Badge variant="outline">{ACTION_LABELS[log.action] || log.action}</Badge>
                                        <span className="text-muted-foreground">
                                          {new Date(log.created_at).toLocaleString('fr-FR')}
                                        </span>
                                      </div>
                                      <div className="mt-1 text-muted-foreground">
                                        {log.changed_by_name}
                                        {typeof log.metadata?.item_name === 'string' ? ` · ${log.metadata.item_name}` : ''}
                                        {log.field_name ? ` · ${log.field_name}` : ''}
                                        {(log.old_value !== null || log.new_value !== null)
                                          ? ` : ${log.old_value ?? ''} → ${log.new_value ?? ''}`
                                          : ''}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* BLOC 3 — Synthèse & analyse */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Synthèse & analyse
            </CardTitle>
            <InventoryPeriodPicker value={synthPeriod} onChange={setSynthPeriod} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Inventaires validés</div>
              <div className="text-2xl font-semibold mt-1">{totals.count}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Valeur écart cumulée</div>
              <div className={`text-2xl font-semibold mt-1 ${totals.totalVariance < 0 ? 'text-destructive' : 'text-success'}`}>
                {currency(totals.totalVariance)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Valeur manquants cumulée</div>
              <div className="text-2xl font-semibold mt-1 text-destructive">{currency(totals.totalMissing)}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Taux de complétion moyen</div>
              <div className="text-2xl font-semibold mt-1">{totals.avgCompletion}%</div>
            </div>
          </div>

          {/* Graphique */}
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" /> Évolution sur la période
            </div>
            {chartData.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Aucun inventaire validé sur la période sélectionnée.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis yAxisId="left" allowDecimals={false} className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip
                    formatter={(v: number, name) =>
                      name === 'count' ? [v, 'Inventaires']
                      : name === 'variance' ? [currency(v), 'Écart']
                      : [currency(v), 'Manquants']
                    }
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar yAxisId="left" dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="variance" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
