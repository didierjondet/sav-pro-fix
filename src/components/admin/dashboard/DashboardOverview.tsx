import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Store,
  Users,
  BarChart3,
  Activity,
} from 'lucide-react';

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

interface DashboardOverviewProps {
  shops: Shop[];
  profiles: Profile[];
  activeSupportCount: number;
}

export function DashboardOverview({ shops, profiles, activeSupportCount }: DashboardOverviewProps) {
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
        <p className="text-xs text-slate-500 mt-1">
          Les métriques financières Stripe sont disponibles dans la section dédiée « Stripe ».
        </p>
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
                <p className="text-slate-600 font-medium">Dossiers SAV</p>
                <p className="text-3xl font-bold text-slate-900">{totalStats.totalCases}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 font-medium">CA Réseau (interne)</p>
                <p className="text-3xl font-bold text-slate-900">
                  {totalStats.totalRevenue.toLocaleString()}€
                </p>
                <p className="text-xs text-slate-500 mt-1">Total généré par les boutiques</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg">
                <Activity className="h-8 w-8 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
