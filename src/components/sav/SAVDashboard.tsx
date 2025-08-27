import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, HardDrive, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SAVForm } from './SAVForm';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShop } from '@/hooks/useShop';
import { useSAVPartsCosts } from '@/hooks/useSAVPartsCosts';
import { useShopStorageUsage } from '@/hooks/useStorageUsage';
import { useMonthlyStatistics } from '@/hooks/useMonthlyStatistics';
import { calculateSAVDelay } from '@/hooks/useSAVDelay';
import { format, differenceInHours } from 'date-fns';

// Limite de stockage par magasin (500 MB = 0.5 GB)
const STORAGE_LIMIT_GB = 0.5;
const statusConfig = {
  pending: {
    label: 'En attente',
    variant: 'secondary' as const
  },
  in_progress: {
    label: 'En cours',
    variant: 'default' as const
  },
  testing: {
    label: 'En test',
    variant: 'default' as const
  },
  parts_ordered: {
    label: 'Pièces commandées',
    variant: 'default' as const
  },
  ready: {
    label: 'Prêt',
    variant: 'default' as const
  },
  delivered: {
    label: 'Livré',
    variant: 'default' as const
  },
  cancelled: {
    label: 'Annulé',
    variant: 'destructive' as const
  }
};
export function SAVDashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const {
    cases,
    loading
  } = useSAVCases();
  const {
    shop
  } = useShop();
  const {
    costs,
    loading: costsLoading
  } = useSAVPartsCosts();
  const {
    storageGB,
    loading: storageLoading
  } = useShopStorageUsage(shop?.id);
  const {
    data: monthlyData,
    loading: monthlyLoading
  } = useMonthlyStatistics(selectedYear);
  const navigate = useNavigate();

  // Calculs pour les statistiques annuelles
  const yearlyStats = useMemo(() => {
    if (monthlyLoading) return { totalRevenue: 0, totalCosts: 0, totalProfit: 0, totalSavs: 0, avgMonthlySavs: 0 };
    
    const totals = monthlyData.reduce((acc, month) => ({
      totalRevenue: acc.totalRevenue + month.revenue,
      totalCosts: acc.totalCosts + month.costs,
      totalProfit: acc.totalProfit + month.profit,
      totalSavs: acc.totalSavs + month.savCount
    }), { totalRevenue: 0, totalCosts: 0, totalProfit: 0, totalSavs: 0 });

    return {
      ...totals,
      avgMonthlySavs: Math.round(totals.totalSavs / 12)
    };
  }, [monthlyData, monthlyLoading]);

  // Générer les années disponibles (5 années passées + année courante + 1 année future)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  }, []);

  // Calculs pour le stockage
  const storageUsagePercent = useMemo(() => {
    if (storageLoading) return 0;
    return Math.min((storageGB / STORAGE_LIMIT_GB) * 100, 100);
  }, [storageGB, storageLoading]);

  const storageChartData = useMemo(() => {
    if (storageLoading) return [];
    const usedGB = Math.min(storageGB, STORAGE_LIMIT_GB);
    const freeGB = Math.max(STORAGE_LIMIT_GB - storageGB, 0);
    
    return [
      { name: 'Espace utilisé', value: usedGB, color: storageUsagePercent > 80 ? '#ef4444' : '#3b82f6' },
      { name: 'Espace libre', value: freeGB, color: '#e5e7eb' }
    ];
  }, [storageGB, storageLoading, storageUsagePercent]);

  // Données pour le graphique de répartition des SAV
  const savDistributionData = useMemo(() => {
    const clientCount = cases.filter(c => c.sav_type === 'client').length;
    const internalCount = cases.filter(c => c.sav_type === 'internal').length;
    const externalCount = cases.filter(c => c.sav_type === 'external').length;
    
    return [
      { name: 'SAV Client', value: clientCount, color: '#ef4444' },
      { name: 'SAV Magasin', value: internalCount, color: '#3b82f6' },
      { name: 'SAV Externe', value: externalCount, color: '#10b981' }
    ];
  }, [cases]);

  // Données pour le graphique de rentabilité
  const profitabilityData = useMemo(() => {
    if (costsLoading) return [];
    
    const totalCosts = costs.takeover_cost + costs.client_cost + costs.external_cost + costs.internal_cost;
    const profit = costs.monthly_revenue - totalCosts;
    
    return [
      {
        name: 'Rentabilité',
        'Chiffre d\'affaires': costs.monthly_revenue,
        'Coûts': totalCosts,
        'Marge': profit
      }
    ];
  }, [costs, costsLoading]);
  return <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold">Tableau de bord SAV</h2>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau SAV
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouveau dossier SAV</DialogTitle>
            </DialogHeader>
            <SAVForm onSuccess={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA du mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costsLoading ? '...' : costs.monthly_revenue.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">SAV prêts uniquement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coût prise en charge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costsLoading ? '...' : costs.takeover_cost.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">SAV client pris en charge</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coût SAV magasin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costsLoading ? '...' : costs.internal_cost.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">Pièces SAV interne</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coût SAV client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costsLoading ? '...' : costs.client_cost.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">SAV client non pris en charge</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${!costsLoading && (costs.monthly_revenue - costs.takeover_cost - costs.client_cost - costs.external_cost) < 0 ? 'text-destructive' : 'text-primary'}`}>
              {costsLoading ? '...' : (costs.monthly_revenue - costs.takeover_cost - costs.client_cost - costs.external_cost).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">CA - Coûts (hors interne)</p>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques annuelles */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Statistiques annuelles
              </CardTitle>
              <CardDescription>
                Vue d'ensemble des performances pour l'année {selectedYear}
              </CardDescription>
            </div>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Indicateurs annuels */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">CA Total {selectedYear}</div>
                <div className="text-2xl font-bold">
                  {monthlyLoading ? '...' : yearlyStats.totalRevenue.toFixed(2)}€
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">Coûts Totaux {selectedYear}</div>
                <div className="text-2xl font-bold">
                  {monthlyLoading ? '...' : yearlyStats.totalCosts.toFixed(2)}€
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">Bénéfice {selectedYear}</div>
                <div className={`text-2xl font-bold ${yearlyStats.totalProfit < 0 ? 'text-destructive' : 'text-primary'}`}>
                  {monthlyLoading ? '...' : yearlyStats.totalProfit.toFixed(2)}€
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium text-muted-foreground">SAV Terminés {selectedYear}</div>
                <div className="text-2xl font-bold">
                  {monthlyLoading ? '...' : yearlyStats.totalSavs}
                </div>
                <div className="text-xs text-muted-foreground">
                  Moy. {yearlyStats.avgMonthlySavs}/mois
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphique mensuel */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-lg font-semibold mb-4">Évolution mensuelle - Chiffres d'affaires et coûts</h4>
              {monthlyLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Chargement...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      label={{ value: 'Euros (€)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${Number(value).toFixed(2)}€`,
                        name === 'revenue' ? 'Chiffre d\'affaires' : 
                        name === 'costs' ? 'Coûts' : 
                        name === 'profit' ? 'Profit' : name
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Chiffre d'affaires" />
                    <Bar dataKey="costs" fill="#ef4444" name="Coûts" />
                    <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">SAV clôturés en retard par mois</h4>
              {monthlyLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">Chargement...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      label={{ value: 'Nombre de SAV', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        value,
                        name === 'overdue_client' ? 'SAV Client en retard' : 
                        name === 'overdue_external' ? 'SAV Externe en retard' : 
                        name === 'overdue_internal' ? 'SAV Interne en retard' : name
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="overdue_client" fill="#ef4444" name="SAV Client en retard" />
                    <Bar dataKey="overdue_external" fill="#10b981" name="SAV Externe en retard" />
                    <Bar dataKey="overdue_internal" fill="#3b82f6" name="SAV Interne en retard" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition des SAV</CardTitle>
            <CardDescription>
              Distribution des types de SAV
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Chargement...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={savDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {savDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rentabilité</CardTitle>
            <CardDescription>
              Chiffre d'affaires, coûts et marge du mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            {costsLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Chargement...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profitabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    label={{ value: 'Euros (€)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${Number(value).toFixed(2)}€`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Chiffre d'affaires" fill="#10b981" />
                  <Bar dataKey="Coûts" fill="#ef4444" />
                  <Bar dataKey="Marge" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graphique d'occupation du stockage */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Occupation du stockage</CardTitle>
          <CardDescription>
            Utilisation de l'espace disque (limite : {STORAGE_LIMIT_GB} GB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {storageLoading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Chargement...</div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={storageChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value.toFixed(3)} GB (${(percent * 100).toFixed(1)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {storageChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${Number(value).toFixed(3)} GB`, '']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <div className="text-center md:text-left">
                  <h4 className="text-lg font-semibold mb-2">Résumé du stockage</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Espace utilisé :</span>
                      <span className={storageUsagePercent > 80 ? 'text-destructive font-medium' : ''}>{storageGB.toFixed(3)} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Limite autorisée :</span>
                      <span>{STORAGE_LIMIT_GB} GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pourcentage utilisé :</span>
                      <span className={storageUsagePercent > 80 ? 'text-destructive font-medium' : ''}>{storageUsagePercent.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Espace restant :</span>
                      <span>{Math.max(STORAGE_LIMIT_GB - storageGB, 0).toFixed(3)} GB</span>
                    </div>
                  </div>
                  {storageUsagePercent > 90 && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ Attention : Vous approchez de votre limite de stockage !
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Contactez le support pour augmenter votre espace de stockage.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>;
}