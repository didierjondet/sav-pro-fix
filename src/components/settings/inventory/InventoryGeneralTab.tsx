import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, ChevronDown, ClipboardList, History, TrendingUp } from 'lucide-react';
import { InventoryJournalDialog } from './InventoryJournalDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  INVENTORY_MODE_LABELS,
  INVENTORY_STATUS_LABELS,
  type InventoryAuditLog,
  type InventorySession,
} from './types';

function currency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  in_progress: 'default',
  paused: 'secondary',
  applied: 'outline',
  cancelled: 'destructive',
  completed: 'secondary',
  draft: 'outline',
};

const ACTION_LABELS: Record<string, string> = {
  session_paused: 'Pause',
  session_resumed: 'Reprise',
  session_stopped: 'Arrêt',
  session_completed: 'Clôture',
  session_cancelled: 'Annulation',
  session_applied: 'Application stock',
  item_updated: 'Ligne modifiée',
  bulk_scan: 'Lot de scan',
};

interface InventoryGeneralTabProps {
  sessions: InventorySession[];
  shopId: string | undefined;
  onOpenSession: (sessionId: string) => void;
  onCreate: () => void;
}

export function InventoryGeneralTab({ sessions, shopId, onOpenSession, onCreate }: InventoryGeneralTabProps) {
  const ongoing = useMemo(
    () => sessions.filter((s) => s.status === 'in_progress' || s.status === 'paused' || s.status === 'completed'),
    [sessions],
  );
  const validated = useMemo(() => sessions.filter((s) => s.status === 'applied'), [sessions]);
  const cancelled = useMemo(() => sessions.filter((s) => s.status === 'cancelled'), [sessions]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { label: string; count: number; variance: number; missing: number }>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      map.set(key, { label, count: 0, variance: 0, missing: 0 });
    }
    validated.forEach((s) => {
      const ref = s.applied_at || s.completed_at || s.created_at;
      const d = new Date(ref);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key);
      if (entry) {
        entry.count += 1;
        entry.variance += s.variance_total_cost || 0;
        entry.missing += s.missing_total_cost || 0;
      }
    });
    return Array.from(map.values());
  }, [validated]);

  const totals = useMemo(() => {
    const totalVariance = validated.reduce((sum, s) => sum + (s.variance_total_cost || 0), 0);
    const totalMissing = validated.reduce((sum, s) => sum + (s.missing_total_cost || 0), 0);
    const avgCompletion = validated.length
      ? validated.reduce((sum, s) => sum + (s.total_items ? s.counted_items / s.total_items : 0), 0) / validated.length
      : 0;
    return { totalVariance, totalMissing, avgCompletion: Math.round(avgCompletion * 100), count: validated.length };
  }, [validated]);

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

  const [globalLogOpen, setGlobalLogOpen] = useState(false);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  const logsBySession = useMemo(() => {
    const map = new Map<string, InventoryAuditLog[]>();
    (logsQuery.data ?? []).forEach((l) => {
      const arr = map.get(l.inventory_session_id) ?? [];
      arr.push(l);
      map.set(l.inventory_session_id, arr);
    });
    return map;
  }, [logsQuery.data]);

  return (
    <div className="space-y-6">
      {/* En-tête + bouton rouge */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Vue générale des inventaires
          </h2>
          <p className="text-sm text-muted-foreground">
            Pilotez vos sessions, suivez les écarts validés et consultez l'historique global.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setGlobalLogOpen(true)} variant="outline" size="lg">
            <History className="h-4 w-4" />
            Journal log global
          </Button>
          <Button onClick={onCreate} variant="destructive" size="lg" className="font-semibold">
            <ClipboardList className="h-4 w-4" />
            Lancer un nouvel inventaire
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

      {/* Sessions en cours */}
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
                  s.status === 'in_progress'
                    ? 'bg-success animate-pulse'
                    : s.status === 'paused'
                      ? 'bg-warning'
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

      {/* Métriques sur validés */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Inventaires validés</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{totals.count}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Valeur écart cumulée</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-3xl font-semibold ${totals.totalVariance < 0 ? 'text-destructive' : 'text-success'}`}>
              {currency(totals.totalVariance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Valeur manquants cumulée</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold text-destructive">{currency(totals.totalMissing)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Taux de complétion moyen</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{totals.avgCompletion}%</div></CardContent>
        </Card>
      </div>

      {/* Graphique */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Évolution sur 12 mois (inventaires validés)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {validated.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Aucun inventaire validé pour le moment.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip
                  formatter={(v: number, name) =>
                    name === 'count' ? [v, 'Inventaires'] : [currency(v), name === 'variance' ? 'Écart' : 'Manquants']
                  }
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des inventaires clôturés</CardTitle>
        </CardHeader>
        <CardContent>
          {validated.length === 0 && cancelled.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Aucun historique.</div>
          ) : (
            <ScrollArea className="max-h-[480px]">
              <div className="space-y-2">
                {[...validated, ...cancelled]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((s) => {
                    const isOpen = openHistoryId === s.id;
                    const sessionLogs = logsBySession.get(s.id) ?? [];
                    return (
                      <Collapsible
                        key={s.id}
                        open={isOpen}
                        onOpenChange={(o) => setOpenHistoryId(o ? s.id : null)}
                        className="rounded-md border"
                      >
                        <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/50">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(s.applied_at || s.completed_at || s.created_at).toLocaleString('fr-FR')}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-muted-foreground">Écart: {currency(s.variance_total_cost)}</span>
                            <Badge variant={statusBadgeVariant[s.status] || 'outline'}>
                              {INVENTORY_STATUS_LABELS[s.status]}
                            </Badge>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </CollapsibleTrigger>
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
                              <div className="mt-3">
                                <Button size="sm" variant="outline" onClick={() => onOpenSession(s.id)}>
                                  Ouvrir la session
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
    </div>
  );
}
