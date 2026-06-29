import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Plug,
  CreditCard,
  Webhook,
  Activity,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HealthResult {
  stripe_key_present: boolean;
  webhook_secret_present: boolean;
  mode: 'live' | 'test' | 'unknown' | null;
  account: {
    id: string;
    email: string | null;
    business_name: string | null;
    country: string | null;
    charges_enabled: boolean;
    payouts_enabled: boolean;
  } | null;
  account_error: string | null;
  prices: Array<{
    plan_id: string;
    plan_name: string;
    tier_key: string;
    local_monthly_price: number;
    local_interval: string;
    stripe_price_id: string | null;
    valid: boolean;
    stripe_amount: number | null;
    stripe_interval: string | null;
    stripe_currency: string | null;
    error: string | null;
  }>;
  checked_at: string;
}

interface MetricsResult {
  mrr?: number;
  subscriber_count?: number;
  last_synced_at?: string;
  error?: string;
  error_kind?: string;
}

export function StripeSystemPanel() {
  const { toast } = useToast();
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [metrics, setMetrics] = useState<MetricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const runHealth = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('stripe-health-check');
    setLoading(false);
    if (error || !data) {
      toast({ title: 'Erreur', description: error?.message ?? 'Impossible de tester Stripe', variant: 'destructive' });
      return;
    }
    setHealth(data as HealthResult);
  };

  const runMetrics = async () => {
    setMetricsLoading(true);
    const { data, error } = await supabase.functions.invoke('stripe-admin-metrics');
    setMetricsLoading(false);
    if (error) {
      setMetrics({ error: error.message });
      return;
    }
    setMetrics(data as MetricsResult);
  };

  useEffect(() => {
    runHealth();
    runMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const StatusPill = ({ ok, labelOk, labelKo }: { ok: boolean; labelOk: string; labelKo: string }) =>
    ok ? (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
        <CheckCircle2 className="h-3 w-3" /> {labelOk}
      </Badge>
    ) : (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> {labelKo}
      </Badge>
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <CreditCard className="h-7 w-7" /> Système & Stripe
        </h2>
        <p className="text-slate-600">Diagnostic complet de l'intégration Stripe et des abonnements.</p>
      </div>

      {/* Connexion Stripe */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" /> Connexion Stripe
          </CardTitle>
          <Button size="sm" variant="outline" onClick={runHealth} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Tester la connexion
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!health ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                <StatusPill ok={health.stripe_key_present} labelOk="Clé STRIPE_SECRET_KEY configurée" labelKo="Clé STRIPE_SECRET_KEY manquante" />
                {health.mode && (
                  <Badge variant={health.mode === 'live' ? 'default' : 'secondary'}>
                    Mode : {health.mode === 'live' ? 'PRODUCTION' : health.mode.toUpperCase()}
                  </Badge>
                )}
              </div>

              {health.account ? (
                <div className="text-sm border rounded-lg p-3 bg-slate-50 space-y-1">
                  <div><span className="text-slate-500">Compte :</span> <strong>{health.account.business_name ?? health.account.id}</strong></div>
                  {health.account.email && <div><span className="text-slate-500">Email :</span> {health.account.email}</div>}
                  <div><span className="text-slate-500">Pays :</span> {health.account.country ?? '—'}</div>
                  <div className="flex gap-2 pt-1">
                    <StatusPill ok={health.account.charges_enabled} labelOk="Paiements actifs" labelKo="Paiements bloqués" />
                    <StatusPill ok={health.account.payouts_enabled} labelOk="Virements actifs" labelKo="Virements bloqués" />
                  </div>
                </div>
              ) : health.account_error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Connexion Stripe en échec</AlertTitle>
                  <AlertDescription className="text-xs font-mono">{health.account_error}</AlertDescription>
                </Alert>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* Synchronisation & métriques */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> Synchronisation des abonnements
          </CardTitle>
          <Button size="sm" variant="outline" onClick={runMetrics} disabled={metricsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
            Resynchroniser
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!metrics ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : metrics.error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Synchronisation Stripe impossible</AlertTitle>
              <AlertDescription>
                <div className="text-xs font-mono">{metrics.error}</div>
                {metrics.error_kind && <div className="text-xs mt-1">Type : {metrics.error_kind}</div>}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="border rounded-lg p-3">
                <div className="text-slate-500">Abonnés actifs</div>
                <div className="text-2xl font-bold">{metrics.subscriber_count ?? 0}</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-slate-500">MRR</div>
                <div className="text-2xl font-bold">{(metrics.mrr ?? 0).toFixed(2)} €</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-slate-500">Dernière synchro</div>
                <div className="text-sm font-medium">{metrics.last_synced_at ? new Date(metrics.last_synced_at).toLocaleString('fr-FR') : '—'}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cohérence Plans <-> Stripe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Cohérence Plans ↔ Stripe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!health ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : health.prices.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun plan actif.</p>
          ) : (
            <div className="space-y-2">
              {health.prices.map((p) => (
                <div key={p.plan_id} className="border rounded-lg p-3 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-medium">{p.plan_name} <span className="text-xs text-slate-500">({p.tier_key})</span></div>
                    <div className="text-xs text-slate-500 font-mono">{p.stripe_price_id ?? '— aucun price_id —'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-right">
                      <div>App : <strong>{p.local_monthly_price} € / {p.local_interval}</strong></div>
                      {p.stripe_amount !== null && (
                        <div>Stripe : <strong>{p.stripe_amount} {p.stripe_currency?.toUpperCase()} / {p.stripe_interval}</strong></div>
                      )}
                    </div>
                    {p.error ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> {p.error}
                      </Badge>
                    ) : p.valid ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> OK
                      </Badge>
                    ) : (
                      <Badge variant="secondary">—</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" /> Webhook Stripe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {health && (
            <StatusPill
              ok={health.webhook_secret_present}
              labelOk="STRIPE_WEBHOOK_SECRET configuré"
              labelKo="STRIPE_WEBHOOK_SECRET manquant"
            />
          )}
          <div className="border rounded-lg p-3 bg-slate-50">
            <div className="text-slate-500 text-xs mb-1">URL à configurer dans Stripe :</div>
            <code className="text-xs break-all">
              https://{import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/stripe-webhook
            </code>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Ouvrir les webhooks dans Stripe
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> Dashboard Stripe
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a
            href={`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_ID}/functions/stripe-admin-metrics/logs`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" /> Logs edge functions
          </a>
        </Button>
      </div>
    </div>
  );
}
