import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Activity, Flame, Users } from 'lucide-react';

interface PageStat {
  path: string;
  views: number;
  unique_users: number;
  avg_seconds: number;
  total_seconds: number;
}

interface HeatPoint {
  x_pct: number;
  y_pct: number;
  weight: number;
}

interface ActivationRow {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  shop_name: string | null;
  signed_up_at: string;
  last_sign_in_at: string | null;
  sav_count: number;
  customer_count: number;
  page_views: number;
  total_seconds: number;
  last_path: string | null;
  activation_status: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  jamais_connecte: { label: 'Jamais connecté', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  connecte_sans_action: { label: 'Connecté sans action', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  a_teste: { label: 'A testé', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  actif: { label: 'Actif', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
};

function formatDuration(seconds: number) {
  if (!seconds) return '0 s';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function UsageAnalytics() {
  const [days, setDays] = useState('30');
  const [search, setSearch] = useState('');
  const [heatPath, setHeatPath] = useState<string>('');
  const [heatDevice, setHeatDevice] = useState<string>('all');

  const { data: pageStats = [], isLoading: loadingPages } = useQuery({
    queryKey: ['usage-page-stats', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_usage_page_stats' as any, { _days: Number(days) });
      if (error) throw error;
      return (data ?? []) as PageStat[];
    },
  });

  const { data: activation = [], isLoading: loadingActivation } = useQuery({
    queryKey: ['signup-activation-report'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_signup_activation_report' as any);
      if (error) throw error;
      return (data ?? []) as ActivationRow[];
    },
  });

  const { data: heat = [] } = useQuery({
    queryKey: ['usage-heatmap', heatPath, days, heatDevice],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_usage_heatmap' as any, {
        _path: heatPath,
        _days: Number(days),
        _device: heatDevice === 'all' ? null : heatDevice,
      });
      if (error) throw error;
      return (data ?? []) as HeatPoint[];
    },
    enabled: !!heatPath,
  });

  const { data: heatLabels = [] } = useQuery({
    queryKey: ['usage-click-labels', heatPath, days, heatDevice],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_usage_click_labels' as any, {
        _path: heatPath,
        _days: Number(days),
        _device: heatDevice === 'all' ? null : heatDevice,
      });
      if (error) throw error;
      return (data ?? []) as { element_label: string; clicks: number }[];
    },
    enabled: !!heatPath,
  });

  const { data: health } = useQuery({
    queryKey: ['usage-tracking-health'],
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_usage_tracking_health' as any);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as
        | { page_views_24h: number; clicks_24h: number; last_page_view: string | null; last_click: string | null }
        | null;
    },
  });



  const funnel = useMemo(() => {
    const total = activation.length;
    const signedIn = activation.filter((a) => a.last_sign_in_at).length;
    const tested = activation.filter((a) => a.sav_count > 0 || a.customer_count > 0).length;
    const active = activation.filter((a) => a.activation_status === 'actif').length;
    return { total, signedIn, tested, active };
  }, [activation]);

  const filteredActivation = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activation;
    return activation.filter((a) =>
      [a.email, a.first_name, a.last_name, a.shop_name, a.activation_status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activation, search]);

  const exportCsv = () => {
    const headers = [
      'Email', 'Prénom', 'Nom', 'Magasin', 'Rôle', 'Inscription', 'Dernière connexion',
      'SAV', 'Clients', 'Pages vues', 'Temps total (s)', 'Dernière page', 'Statut',
    ];
    const rows = filteredActivation.map((a) => [
      a.email, a.first_name ?? '', a.last_name ?? '', a.shop_name ?? '', a.role ?? '',
      a.signed_up_at ? new Date(a.signed_up_at).toLocaleDateString('fr-FR') : '',
      a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleDateString('fr-FR') : '',
      a.sav_count, a.customer_count, a.page_views, a.total_seconds, a.last_path ?? '',
      statusLabels[a.activation_status]?.label ?? a.activation_status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixway-inscrits-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxWeight = Math.max(1, ...heat.map((h) => h.weight));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-2xl font-bold">Usage & activation</h2>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
            <SelectItem value="365">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Inscrits', value: funnel.total },
          { label: 'Se sont connectés', value: funnel.signedIn },
          { label: 'Ont créé quelque chose', value: funnel.tested },
          { label: 'Réellement actifs', value: funnel.active },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="text-3xl font-bold">{k.value}</p>
              {funnel.total > 0 && (
                <p className="text-xs text-muted-foreground">
                  {Math.round((k.value / funnel.total) * 100)}% des inscrits
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages"><Activity className="h-4 w-4 mr-2" />Pages</TabsTrigger>
          <TabsTrigger value="heatmap"><Flame className="h-4 w-4 mr-2" />Heatmap</TabsTrigger>
          <TabsTrigger value="activation"><Users className="h-4 w-4 mr-2" />Inscrits</TabsTrigger>
        </TabsList>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Temps passé par page</CardTitle>
              <CardDescription>
                Un temps très long peut signaler un blocage, un temps très court un abandon immédiat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPages ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : pageStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune donnée pour l'instant. Le suivi démarre dès la prochaine navigation des utilisateurs.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead className="text-right">Vues</TableHead>
                      <TableHead className="text-right">Utilisateurs</TableHead>
                      <TableHead className="text-right">Temps moyen</TableHead>
                      <TableHead className="text-right">Temps total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageStats.map((p) => (
                      <TableRow key={p.path}>
                        <TableCell className="font-mono text-xs">{p.path}</TableCell>
                        <TableCell className="text-right">{p.views}</TableCell>
                        <TableCell className="text-right">{p.unique_users}</TableCell>
                        <TableCell className="text-right">{formatDuration(Number(p.avg_seconds))}</TableCell>
                        <TableCell className="text-right">{formatDuration(Number(p.total_seconds))}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setHeatPath(p.path)}>
                            <Flame className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle>Heatmap des clics</CardTitle>
              <CardDescription>Position relative des clics sur la page sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Select value={heatPath} onValueChange={setHeatPath}>
                  <SelectTrigger className="w-72"><SelectValue placeholder="Choisir une page" /></SelectTrigger>
                  <SelectContent>
                    {pageStats.map((p) => (
                      <SelectItem key={p.path} value={p.path}>{p.path}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={heatDevice} onValueChange={setHeatDevice}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous appareils</SelectItem>
                    <SelectItem value="desktop">Ordinateur</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!heatPath ? (
                <p className="text-sm text-muted-foreground">Sélectionnez une page pour afficher la heatmap.</p>
              ) : heat.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun clic enregistré sur cette page pour la période.</p>
              ) : (
                <div className="relative w-full rounded-md border bg-muted/30 overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
                  {heat.map((h, i) => {
                    const intensity = Number(h.weight) / maxWeight;
                    return (
                      <div
                        key={i}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          left: `${h.x_pct}%`,
                          top: `${h.y_pct}%`,
                          transform: 'translate(-50%, -50%)',
                          width: `${18 + intensity * 34}px`,
                          height: `${18 + intensity * 34}px`,
                          background: `radial-gradient(circle, hsla(${45 - intensity * 45}, 95%, 55%, ${0.25 + intensity * 0.5}) 0%, transparent 70%)`,
                        }}
                      />
                    );
                  })}
                  <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 rounded px-2 py-1">
                    {heat.reduce((s, h) => s + Number(h.weight), 0)} clics
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activation">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle>Tableau des inscrits</CardTitle>
                <CardDescription>Où chaque inscrit s'est arrêté.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-56"
                />
                <Button variant="outline" onClick={exportCsv}>
                  <Download className="h-4 w-4 mr-2" />Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingActivation ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Magasin</TableHead>
                        <TableHead>Inscription</TableHead>
                        <TableHead>Dernière connexion</TableHead>
                        <TableHead className="text-right">SAV</TableHead>
                        <TableHead className="text-right">Clients</TableHead>
                        <TableHead className="text-right">Temps</TableHead>
                        <TableHead>Dernière page</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActivation.map((a) => (
                        <TableRow key={a.user_id}>
                          <TableCell>
                            <div className="text-sm font-medium">{[a.first_name, a.last_name].filter(Boolean).join(' ') || '—'}</div>
                            <div className="text-xs text-muted-foreground">{a.email}</div>
                          </TableCell>
                          <TableCell className="text-sm">{a.shop_name ?? '—'}</TableCell>
                          <TableCell className="text-sm">{new Date(a.signed_up_at).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell className="text-sm">
                            {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleDateString('fr-FR') : '—'}
                          </TableCell>
                          <TableCell className="text-right">{a.sav_count}</TableCell>
                          <TableCell className="text-right">{a.customer_count}</TableCell>
                          <TableCell className="text-right">{formatDuration(Number(a.total_seconds))}</TableCell>
                          <TableCell className="font-mono text-xs">{a.last_path ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusLabels[a.activation_status]?.className}>
                              {statusLabels[a.activation_status]?.label ?? a.activation_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UsageAnalytics;
