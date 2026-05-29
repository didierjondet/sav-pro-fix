import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare, RefreshCw, Wallet, Send, AlertTriangle, CheckCircle2,
  Plus, Minus, RotateCcw, Search, Bell, Save, ExternalLink, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ShopRow {
  shop_id: string;
  shop_name: string;
  subscription_tier: string;
  monthly_allocated: number;
  monthly_used: number;
  monthly_remaining: number;
  purchased_total: number;
  admin_added: number;
  purchasable_used: number;
  purchasable_remaining: number;
  total_available: number;
  total_remaining: number;
  overall_usage_percent: number;
}

interface BrevoBalance {
  balance: number;
  plan_name?: string;
  account_email?: string;
  company?: string;
  last_sync_at?: string;
}

export function SMSCreditsCenter() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [brevo, setBrevo] = useState<BrevoBalance | null>(null);
  const [globalPot, setGlobalPot] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState(false);

  // Alert config
  const [alertThreshold, setAlertThreshold] = useState(100);
  const [alertPhone, setAlertPhone] = useState('');
  const [savingAlert, setSavingAlert] = useState(false);

  const setBusy = (id: string, v: boolean) => setRowLoading(prev => ({ ...prev, [id]: v }));

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [shopsRes, globalRes, alertRes] = await Promise.all([
        supabase.from('shops').select('id, name, subscription_tier, sms_credits_allocated, monthly_sms_used, admin_added_sms_credits, purchased_sms_credits').order('name'),
        supabase.from('global_sms_credits').select('total_credits, last_sync_at').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle(),
        supabase.from('twilio_alert_config').select('threshold_sms, alert_phone').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle(),
      ]);

      if (shopsRes.error) throw shopsRes.error;

      const rows = await Promise.all((shopsRes.data || []).map(async (s: any) => {
        const { data: pkgs } = await supabase
          .from('sms_package_purchases')
          .select('sms_count')
          .eq('shop_id', s.id)
          .eq('status', 'completed');
        const purchased_total = (pkgs || []).reduce((sum, p: any) => sum + (p.sms_count || 0), 0);
        const admin_added = s.admin_added_sms_credits || 0;
        const monthly_allocated = s.sms_credits_allocated || 0;
        const monthly_used = s.monthly_sms_used || 0;
        const purchasable_used = s.purchased_sms_credits || 0;
        const monthly_remaining = Math.max(0, monthly_allocated - monthly_used);
        const purchasable_total = purchased_total + admin_added;
        const purchasable_remaining = Math.max(0, purchasable_total - purchasable_used);
        const total_available = monthly_allocated + purchasable_total;
        const total_remaining = monthly_remaining + purchasable_remaining;
        const used = monthly_used + purchasable_used;
        const overall_usage_percent = total_available > 0 ? Math.round((used / total_available) * 100) : 0;
        return {
          shop_id: s.id, shop_name: s.name, subscription_tier: s.subscription_tier || 'free',
          monthly_allocated, monthly_used, monthly_remaining,
          purchased_total, admin_added, purchasable_used, purchasable_remaining,
          total_available, total_remaining, overall_usage_percent,
        } as ShopRow;
      }));

      setShops(rows);
      setGlobalPot(globalRes.data?.total_credits || 0);
      if (alertRes.data) {
        setAlertThreshold(alertRes.data.threshold_sms || 100);
        setAlertPhone(alertRes.data.alert_phone || '');
      }
    } catch (e: any) {
      toast({ title: 'Erreur de chargement', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const syncBrevo = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('brevo-sms-balance', { body: {} });
      if (error) {
        let msg = error.message;
        try { const ctx = (error as any).context; if (ctx) { const b = await ctx.json?.() || ctx; msg = b?.error || msg; } } catch {}
        throw new Error(msg);
      }
      setBrevo(data);
      toast({ title: 'Synchronisation Brevo OK', description: `${data.balance} SMS disponibles chez Brevo.` });
      await fetchAll();
    } catch (e: any) {
      toast({ title: 'Erreur Brevo', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const totals = useMemo(() => {
    const allocated = shops.reduce((s, r) => s + r.total_available, 0);
    const remaining = shops.reduce((s, r) => s + r.total_remaining, 0);
    const reserved = allocated - remaining; // déjà consommés
    return { allocated, remaining, reserved };
  }, [shops]);

  const projected = useMemo(() => {
    // Balance projetée = solde Brevo - (alloué non consommé) = solde Brevo - (allocated - reserved)
    const brevoBal = brevo?.balance ?? globalPot;
    return brevoBal - (totals.allocated - totals.reserved);
  }, [brevo, globalPot, totals]);

  const balanceTone = useMemo(() => {
    const brevoBal = brevo?.balance ?? globalPot;
    if (!brevoBal) return 'destructive';
    const ratio = (brevoBal > 0 ? Math.max(projected, 0) / brevoBal : 0);
    if (ratio > 0.2) return 'success';
    if (ratio > 0.05) return 'warning';
    return 'destructive';
  }, [projected, brevo, globalPot]);

  const handleAddCredits = async (shopId: string, amount: number) => {
    if (amount <= 0) return;
    setBusy(shopId, true);
    try {
      const { error } = await supabase.rpc('admin_add_sms_credits', { p_shop_id: shopId, p_amount: amount });
      if (error) throw error;
      toast({ title: 'Crédits ajoutés', description: `${amount} SMS attribués.` });
      await fetchAll();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setBusy(shopId, false); }
  };

  const handleRemoveCredits = async (shopId: string, amount: number) => {
    if (amount <= 0) return;
    setBusy(shopId, true);
    try {
      const { error } = await supabase.rpc('admin_remove_sms_credits', { p_shop_id: shopId, p_amount: amount });
      if (error) throw error;
      toast({ title: 'Crédits retirés', description: `${amount} SMS réinjectés dans le pot global.` });
      await fetchAll();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setBusy(shopId, false); }
  };

  const handleResetShop = async (shopId: string) => {
    setBusy(shopId, true);
    try {
      const { error } = await supabase.rpc('admin_reset_shop_monthly_sms', { p_shop_id: shopId });
      if (error) throw error;
      toast({ title: 'Compteur réinitialisé', description: 'Compteur mensuel à zéro.' });
      await fetchAll();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setBusy(shopId, false); }
  };

  const handleResetAll = async () => {
    if (!confirm('Réinitialiser le compteur mensuel SMS de TOUTES les boutiques ?')) return;
    setResetting(true);
    try {
      const { error } = await supabase.rpc('admin_reset_all_monthly_sms');
      if (error) throw error;
      toast({ title: 'Reset global effectué', description: 'Tous les compteurs sont à zéro.' });
      await fetchAll();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setResetting(false); }
  };

  const handleSaveAlert = async () => {
    setSavingAlert(true);
    try {
      const { error } = await supabase
        .from('twilio_alert_config')
        .upsert({ id: '00000000-0000-0000-0000-000000000001', threshold_sms: alertThreshold, alert_phone: alertPhone, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast({ title: 'Alerte sauvegardée' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setSavingAlert(false); }
  };

  const filteredShops = shops.filter(s => s.shop_name.toLowerCase().includes(search.toLowerCase()));

  const usageBadge = (pct: number) => {
    if (pct >= 85) return <Badge variant="destructive">{pct}%</Badge>;
    if (pct >= 60) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{pct}%</Badge>;
    return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">{pct}%</Badge>;
  };

  const kpiToneClass = (tone: string) => {
    if (tone === 'success') return 'border-emerald-500/50 bg-emerald-500/5';
    if (tone === 'warning') return 'border-amber-500/50 bg-amber-500/5';
    return 'border-destructive/50 bg-destructive/5';
  };

  return (
    <div className="space-y-6">
      {/* Bloc A - KPI */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" /> Crédits SMS — Brevo
            </h2>
            <p className="text-sm text-muted-foreground">Vue centralisée : solde Brevo, allocations, réservations, ré-attribution.</p>
          </div>
          <Button onClick={syncBrevo} disabled={syncing} variant="default">
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Synchroniser Brevo
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" />Solde Brevo</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{brevo?.balance ?? globalPot}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {brevo?.last_sync_at ? `Sync ${new Date(brevo.last_sync_at).toLocaleString('fr-FR')}` : 'Cliquez "Synchroniser Brevo"'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4 text-primary" />Alloués aux boutiques</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.allocated}</div>
              <p className="text-xs text-muted-foreground mt-1">{shops.length} boutiques</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Réservés / consommés</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.reserved}</div>
              <p className="text-xs text-muted-foreground mt-1">{totals.remaining} restants côté boutiques</p>
            </CardContent>
          </Card>

          <Card className={cn('border-2', kpiToneClass(balanceTone))}>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">
              {balanceTone === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
              Balance projetée
            </CardTitle></CardHeader>
            <CardContent>
              <div className={cn('text-3xl font-bold', projected < 0 && 'text-destructive')}>{projected}</div>
              <p className="text-xs text-muted-foreground mt-1">
                = Solde Brevo − allocations non consommées
              </p>
            </CardContent>
          </Card>
        </div>

        {balanceTone === 'destructive' && (
          <Alert variant="destructive" className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Recréditer Brevo recommandé : la balance projetée est critique.</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Bloc B - Actions globales + Alerte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><RotateCcw className="h-4 w-4" />Actions globales</CardTitle>
            <CardDescription>Reset mensuel — le cron `reset_monthly_counters` tourne automatiquement le 1er de chaque mois.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleResetAll} disabled={resetting} variant="outline" className="w-full">
              {resetting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Reset mensuel manuel (toutes boutiques)
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <a href="#" onClick={(e) => { e.preventDefault(); document.dispatchEvent(new CustomEvent('super-admin-navigate', { detail: 'messaging' })); }}>
                <ExternalLink className="h-4 w-4 mr-2" /> Configurer les providers SMS / Mail
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Alerte SMS Brevo</CardTitle>
            <CardDescription>Reçoit un SMS si le solde Brevo descend sous le seuil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Seuil (SMS)</Label>
                <NumberInput value={alertThreshold} onChange={(e) => setAlertThreshold(Number(e.target.value) || 0)} min={0} />
              </div>
              <div>
                <Label className="text-xs">Téléphone</Label>
                <Input value={alertPhone} onChange={(e) => setAlertPhone(e.target.value)} placeholder="+33..." />
              </div>
            </div>
            <Button onClick={handleSaveAlert} disabled={savingAlert} className="w-full">
              {savingAlert ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Sauvegarder l'alerte
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bloc C - Tableau boutiques */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Boutiques</CardTitle>
              <CardDescription>Allouer, retirer (réinjection dans le pot global), réinitialiser le mois.</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Boutique</TableHead>
                  <TableHead className="text-center">Plan</TableHead>
                  <TableHead className="text-center">Mensuel</TableHead>
                  <TableHead className="text-center">Achetés / Admin</TableHead>
                  <TableHead className="text-center">Total restant</TableHead>
                  <TableHead className="text-center">Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement...</TableCell></TableRow>
                )}
                {!loading && filteredShops.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune boutique.</TableCell></TableRow>
                )}
                {!loading && filteredShops.map((s) => (
                  <ShopRowEditor
                    key={s.shop_id}
                    row={s}
                    busy={!!rowLoading[s.shop_id]}
                    onAdd={(amt) => handleAddCredits(s.shop_id, amt)}
                    onRemove={(amt) => handleRemoveCredits(s.shop_id, amt)}
                    onReset={() => handleResetShop(s.shop_id)}
                    usageBadge={usageBadge}
                  />
                ))}
              </TableBody>
              {!loading && filteredShops.length > 0 && (
                <tfoot>
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={4} className="text-right">TOTAUX</TableCell>
                    <TableCell className="text-center">{totals.remaining} / {totals.allocated}</TableCell>
                    <TableCell className="text-center">{totals.allocated > 0 ? Math.round((totals.reserved / totals.allocated) * 100) : 0}%</TableCell>
                    <TableCell />
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ShopRowEditor({ row, busy, onAdd, onRemove, onReset, usageBadge }: {
  row: ShopRow; busy: boolean;
  onAdd: (n: number) => void; onRemove: (n: number) => void; onReset: () => void;
  usageBadge: (pct: number) => JSX.Element;
}) {
  const [addAmt, setAddAmt] = useState(50);
  const [removeAmt, setRemoveAmt] = useState(50);
  return (
    <TableRow>
      <TableCell className="font-medium">{row.shop_name}</TableCell>
      <TableCell className="text-center"><Badge variant="outline" className="capitalize">{row.subscription_tier}</Badge></TableCell>
      <TableCell className="text-center text-sm">{row.monthly_used} / {row.monthly_allocated}</TableCell>
      <TableCell className="text-center text-sm">
        <div>{row.purchasable_remaining}</div>
        <div className="text-xs text-muted-foreground">acheté {row.purchased_total} + admin {row.admin_added}</div>
      </TableCell>
      <TableCell className="text-center font-semibold">{row.total_remaining}</TableCell>
      <TableCell className="text-center">{usageBadge(row.overall_usage_percent)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={busy} title="Ajouter des crédits">
                <Plus className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 space-y-2">
              <Label className="text-xs">Ajouter des SMS</Label>
              <NumberInput value={addAmt} onChange={(e) => setAddAmt(Number(e.target.value) || 0)} min={1} />
              <Button size="sm" className="w-full" onClick={() => onAdd(addAmt)} disabled={busy}>Ajouter {addAmt}</Button>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={busy || row.admin_added <= 0} title="Retirer des crédits admin (réinjection pot global)">
                <Minus className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 space-y-2">
              <Label className="text-xs">Retirer des SMS admin</Label>
              <p className="text-xs text-muted-foreground">Max : {row.admin_added}. Réinjectés dans le pot global.</p>
              <NumberInput value={removeAmt} onChange={(e) => setRemoveAmt(Number(e.target.value) || 0)} min={1} max={row.admin_added} />
              <Button size="sm" variant="destructive" className="w-full" onClick={() => onRemove(Math.min(removeAmt, row.admin_added))} disabled={busy}>
                Retirer
              </Button>
            </PopoverContent>
          </Popover>

          <Button size="sm" variant="ghost" onClick={onReset} disabled={busy} title="Reset mensuel">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
