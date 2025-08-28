import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Store, 
  Users, 
  DollarSign,
  BarChart3,
  TrendingUp,
  Activity
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

interface SubscriptionPlan {
  id: string;
  name: string;
  monthly_price: number;
}

interface DashboardOverviewProps {
  shops: Shop[];
  profiles: Profile[];
  activeSupportCount: number;
}

export function DashboardOverview({ shops, profiles, activeSupportCount }: DashboardOverviewProps) {
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionPlans();
  }, []);

  const fetchSubscriptionPlans = async () => {
    try {
      console.log('🔍 Récupération des plans d\'abonnement...');
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, monthly_price')
        .eq('is_active', true)
        .order('monthly_price');

      if (error) throw error;
      console.log('📊 Plans récupérés:', data);
      setSubscriptionPlans(data || []);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des plans:', error);
      setSubscriptionPlans([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques basées sur les vrais plans
  const getShopsByPlan = () => {
    const planStats = subscriptionPlans.map(plan => {
      const shopsWithPlan = shops.filter(shop => shop.subscription_plan_id === plan.id);
      return {
        ...plan,
        shopCount: shopsWithPlan.length,
        revenue: shopsWithPlan.length * plan.monthly_price
      };
    });

    // Ajouter les magasins sans plan assigné
    const shopsWithoutPlan = shops.filter(shop => !shop.subscription_plan_id);
    if (shopsWithoutPlan.length > 0) {
      planStats.push({
        id: 'no-plan',
        name: 'Sans plan assigné',
        monthly_price: 0,
        shopCount: shopsWithoutPlan.length,
        revenue: 0
      });
    }

    return planStats;
  };

  const planStats = getShopsByPlan();
  const totalSubscriptionRevenue = planStats.reduce((sum, plan) => sum + plan.revenue, 0);

  const totalStats = {
    totalShops: shops.length,
    totalUsers: profiles.length,
    totalRevenue: shops.reduce((sum, shop) => sum + (shop.total_revenue || 0), 0),
    totalCases: shops.reduce((sum, shop) => sum + (shop.total_sav_cases || 0), 0),
    totalSubscriptionRevenue,
    activeSupportTickets: activeSupportCount,
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Tableau de bord</h2>
        <p className="text-lg text-slate-600">Vue d'ensemble du réseau SAV Pro</p>
      </div>

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
                <p className="text-slate-600 font-medium">CA Abonnements</p>
                <p className="text-3xl font-bold text-slate-900">{totalStats.totalSubscriptionRevenue}€</p>
                <p className="text-sm text-slate-500">/ mois</p>
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
        {/* Répartition des plans */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Répartition des Plans d'Abonnement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-slate-600 mt-2">Chargement des plans...</p>
                </div>
              ) : (
                planStats.map((plan, index) => {
                  const percentage = shops.length > 0 ? (plan.shopCount / shops.length * 100).toFixed(1) : 0;
                  const colors = ['bg-gray-400', 'bg-green-500', 'bg-blue-500', 'bg-purple-600', 'bg-orange-500'];
                  
                  return (
                    <div key={plan.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-slate-600">{plan.monthly_price}€/mois</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{plan.shopCount} magasins</p>
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
              Détails du Chiffre d'Affaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-800 font-medium">CA Abonnements (mensuel)</p>
                    <p className="text-2xl font-bold text-green-900">{totalStats.totalSubscriptionRevenue}€</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-800 font-medium">CA Abonnements (annuel)</p>
                    <p className="text-2xl font-bold text-blue-900">0€</p>
                    <p className="text-xs text-blue-600 mt-1">Aucun abonnement annuel</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-800 font-medium">CA Réseau (total généré)</p>
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