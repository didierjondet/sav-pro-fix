import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PlanBreakdownEntry {
  price_id: string;
  plan_name: string;
  monthly_price: number;
  interval: string;
  count: number;
  revenue: number;
}

interface StripeMetrics {
  configured: boolean;
  message?: string;
  mrr: number;
  monthly_revenue: number;
  annual_revenue: number;
  subscriber_count: number;
  plan_breakdown: PlanBreakdownEntry[];
  revenue_30d: number;
  revenue_12m: number;
  last_synced_at: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(
    Math.round(n * 100) / 100,
  );

export function StripeOverview() {
  const [metrics, setMetrics] = useState<StripeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke('stripe-admin-metrics');
    if (error || !data || (data as any).error) {
      console.error('stripe-admin-metrics error', error || data);
      setError((data as any)?.error || error?.message || 'Erreur Stripe');
      setMetrics(null);
    } else {
      setMetrics(data as StripeMetrics);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-purple-600" />
            Stripe — Fixway
          </h2>
          <p className="text-slate-600 mt-1">
            Métriques consolidées de facturation
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <ShieldCheck className="h-4 w-4 text-blue-700" />
        <AlertDescription className="text-blue-900">
          <strong>Données isolées Fixway.</strong> Seuls les abonnements et factures
          rattachés aux <em>price IDs</em> déclarés dans « Plans d'abonnement » sont
          comptabilisés. Les autres produits du compte Stripe sont ignorés.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Erreur Stripe : {error}</AlertDescription>
        </Alert>
      )}

      {metrics && metrics.configured === false && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {metrics.message || "Aucun plan Fixway n'a de price Stripe configuré."}{' '}
            Renseignez les <strong>Stripe Price ID</strong> dans la section
            « Plans d'abonnement ».
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="MRR"
          value={`${fmt(metrics?.mrr ?? 0)}€`}
          subtitle="Revenu mensuel récurrent"
          color="purple"
          icon={DollarSign}
        />
        <KpiCard
          label="Abonnés actifs"
          value={`${metrics?.subscriber_count ?? 0}`}
          subtitle="Souscriptions actives + trial"
          color="emerald"
          icon={Users}
        />
        <KpiCard
          label="CA mensuel"
          value={`${fmt(metrics?.monthly_revenue ?? 0)}€`}
          subtitle="Plans mensuels facturés"
          color="blue"
          icon={TrendingUp}
        />
        <KpiCard
          label="CA annuel"
          value={`${fmt(metrics?.annual_revenue ?? 0)}€`}
          subtitle={`soit ${fmt((metrics?.annual_revenue ?? 0) / 12)}€/mois`}
          color="orange"
          icon={BarChart3}
        />
      </div>

      {/* Encaissements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Encaissé (30 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {fmt(metrics?.revenue_30d ?? 0)}€
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Factures payées (lignes Fixway uniquement)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Encaissé (12 derniers mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {fmt(metrics?.revenue_12m ?? 0)}€
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Factures payées (lignes Fixway uniquement)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Répartition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Répartition par plan Fixway
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-slate-600 mt-2">Chargement Stripe…</p>
            </div>
          ) : !metrics?.plan_breakdown?.length ? (
            <p className="text-sm text-slate-500 text-center py-6">
              Aucun abonnement Fixway actif sur Stripe.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 border-b">
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Prix</th>
                    <th className="py-2 pr-4">Intervalle</th>
                    <th className="py-2 pr-4 text-right">Abonnés</th>
                    <th className="py-2 pr-4 text-right">Revenu</th>
                    <th className="py-2 pr-4">Price ID</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.plan_breakdown.map((p) => (
                    <tr key={p.price_id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{p.plan_name}</td>
                      <td className="py-2 pr-4">{fmt(p.monthly_price)}€/mois</td>
                      <td className="py-2 pr-4">
                        {p.interval === 'year' ? 'Annuel' : 'Mensuel'}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold">
                        {p.count}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {fmt(p.revenue)}€
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-slate-500">
                        {p.price_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {metrics?.last_synced_at && (
        <p className="text-xs text-slate-400 text-right">
          Dernière synchro : {new Date(metrics.last_synced_at).toLocaleString('fr-FR')}
        </p>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  color: 'purple' | 'emerald' | 'blue' | 'orange';
  icon: React.ComponentType<{ className?: string }>;
}) {
  const colorMap = {
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
  } as const;
  return (
    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 font-medium">{label}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-lg ${colorMap[color]}`}>
            <Icon className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
