import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Store,
  Users,
  DollarSign,
  BarChart3,
  TrendingUp,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Shop {
  id: string;
  name: string;
  subscription_tier: string;
  subscription_plan_id?: string;
  total_revenue?: number;
  total_sav_cases?: number;
  total_users?: number;
}

interface Profile {
  id: string;
  role: string;
}

interface PlanBreakdownEntry {
  price_id: string;
  product_id: string;
  plan_name: string;
  monthly_price: number;
  interval: string;
  count: number;
  revenue: number;
}

interface StripeMetrics {
  mrr: number;
  monthly_revenue: number;
  annual_revenue: number;
  subscriber_count: number;
  plan_breakdown: PlanBreakdownEntry[];
  last_synced_at: string;
}

interface DashboardOverviewProps {
  shops: Shop[];
  profiles: Profile[];
  activeSupportCount: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(
    Math.round(n * 100) / 100,
  );

export function DashboardOverview({ shops, profiles, activeSupportCount }: DashboardOverviewProps) {
  const [metrics, setMetrics] = useState<StripeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke('stripe-admin-metrics');
      if (cancelled) return;
      if (error || !data || (data as any).error) {
        console.error('stripe-admin-metrics error', error || data);
        setError((data as any)?.error || error?.message || 'Erreur Stripe');
        setMetrics(null);
      } else {
        setMetrics(data as StripeMetrics);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mrr = metrics?.mrr ?? 0;
  const monthlyRevenue = metrics?.monthly_revenue ?? 0;
  const annualRevenue = metrics?.annual_revenue ?? 0;
  const subscriberCount = metrics?.subscriber_count ?? 0;
  const planBreakdown = metrics?.plan_breakdown ?? [];

  const totalStats = {
    totalShops: shops.length,
    totalUsers: profiles.length,
    totalRevenue: shops.reduce((sum, shop) => sum + (shop.total_revenue || 0), 0),
    totalCases: shops.reduce((sum, shop) => sum + (shop.total_sav_cases || 0), 0),
    activeSupportTickets: activeSupportCount,
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Tableau de bord</h2>
        <p className="text-lg text-slate-600">Vue d'ensemble du réseau SAV Pro</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="h-4 w-4" />
          Données Stripe indisponibles : {error}
        </div>
      )}

      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 font-medium">Total Magasins</p>
                <p className="text-3xl font-bold text-slate-900">{totalStats.totalShops}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Store className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 font-medium">Total Utilisateurs</p>
                <p className="text-3xl font-bold text-slate-900">{totalStats.totalUsers}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Users className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 font-medium">CA Abonnements (Stripe)</p>
                <p className="text-3xl font-bold text-slate-900">{fmt(mrr)}€</p>
                <p className="text-sm text-slate-500">MRR / mois</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 font-medium">Dossiers SAV</p>
                <p className="text-3xl font-bold text-slate-900">{totalStats.totalCases}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicateurs spécifiques aux abonnements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Répartition des plans (Stripe) */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Répartition des Abonnements Stripe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-slate-600 mt-2">Chargement Stripe...</p>
                </div>
              ) : planBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Aucun abonnement actif sur Stripe.
                </p>
              ) : (
                planBreakdown.map((plan, index) => {
                  const percentage = subscriberCount > 0
                    ? ((plan.count / subscriberCount) * 100).toFixed(1)
                    : '0';
                  const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-600', 'bg-orange-500', 'bg-gray-400'];
                  return (
                    <div key={plan.price_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                        <div>
                          <p className="font-medium">{plan.plan_name}</p>
                          <p className="text-sm text-slate-600">
                            {fmt(plan.monthly_price)}€/mois
                            {plan.interval === 'year' && ' (annuel)'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{plan.count} abonnés</p>
                        <p className="text-sm text-slate-600">{percentage}%</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Détails du CA */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Chiffre d'Affaires encaissé (Stripe)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-800 font-medium">Abonnements mensuels</p>
                    <p className="text-2xl font-bold text-green-900">{fmt(monthlyRevenue)}€</p>
                    <p className="text-xs text-green-700 mt-1">facturés tous les mois</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-800 font-medium">Abonnements annuels</p>
                    <p className="text-2xl font-bold text-blue-900">{fmt(annualRevenue)}€</p>
                    <p className="text-xs text-blue-600 mt-1">
                      soit {fmt(annualRevenue / 12)}€/mois annualisé
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-800 font-medium">CA Réseau (interne, total généré)</p>
                    <p className="text-2xl font-bold text-slate-900">{totalStats.totalRevenue.toLocaleString()}€</p>
                  </div>
                  <Activity className="h-8 w-8 text-slate-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
