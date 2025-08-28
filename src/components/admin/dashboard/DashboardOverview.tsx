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

interface Shop {
  id: string;
  name: string;
  subscription_tier: string;
  total_revenue?: number;
  total_sav_cases?: number;
  total_users?: number;
}

interface Profile {
  id: string;
  role: string;
}

interface DashboardOverviewProps {
  shops: Shop[];
  profiles: Profile[];
  activeSupportCount: number;
}

// Fonction pour calculer le revenu des abonnements basé sur les plans
const calculateSubscriptionRevenue = (shops: Shop[]) => {
  const planPrices = { 'free': 0, 'premium': 29, 'enterprise': 99 };
  
  return shops.reduce((sum, shop) => {
    return sum + (planPrices[shop.subscription_tier as keyof typeof planPrices] || 0);
  }, 0);
};

export function DashboardOverview({ shops, profiles, activeSupportCount }: DashboardOverviewProps) {
  const totalStats = {
    totalShops: shops.length,
    totalUsers: profiles.length,
    totalRevenue: shops.reduce((sum, shop) => sum + (shop.total_revenue || 0), 0),
    totalCases: shops.reduce((sum, shop) => sum + (shop.total_sav_cases || 0), 0),
    totalSubscriptionRevenue: calculateSubscriptionRevenue(shops),
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
              {['free', 'premium', 'enterprise'].map(tier => {
                const count = shops.filter(shop => shop.subscription_tier === tier).length;
                const percentage = shops.length > 0 ? (count / shops.length * 100).toFixed(1) : 0;
                const planPrice = tier === 'free' ? 0 : tier === 'premium' ? 29 : 99;
                
                return (
                  <div key={tier} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        tier === 'free' ? 'bg-gray-400' : 
                        tier === 'premium' ? 'bg-blue-500' : 'bg-purple-600'
                      }`}></div>
                      <div>
                        <p className="font-medium capitalize">{tier === 'free' ? 'Gratuit' : tier === 'premium' ? 'Premium' : 'Enterprise'}</p>
                        <p className="text-sm text-slate-600">{planPrice}€/mois</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{count} magasins</p>
                      <p className="text-sm text-slate-600">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
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
                    <p className="text-2xl font-bold text-blue-900">{(totalStats.totalSubscriptionRevenue * 12).toLocaleString()}€</p>
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