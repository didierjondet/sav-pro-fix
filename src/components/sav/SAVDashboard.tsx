import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, HardDrive, Calendar, Info } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SAVForm } from './SAVForm';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShop } from '@/hooks/useShop';
import { useSAVPartsCosts } from '@/hooks/useSAVPartsCosts';
import { useShopStorageUsage } from '@/hooks/useStorageUsage';
import { useMonthlyStatistics } from '@/hooks/useMonthlyStatistics';
import { calculateSAVDelay } from '@/hooks/useSAVDelay';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { format, differenceInHours } from 'date-fns';

// Limite de stockage par magasin (500 MB = 0.5 GB)
const STORAGE_LIMIT_GB = 0.5;

export function SAVDashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { cases, loading } = useSAVCases();
  const { shop } = useShop();
  const { costs, loading: costsLoading } = useSAVPartsCosts();
  const { storageGB, loading: storageLoading } = useShopStorageUsage(shop?.id);
  const { data: monthlyData, loading: monthlyLoading } = useMonthlyStatistics(selectedYear);
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();
  const navigate = useNavigate();

  // Fonctions pour naviguer vers les SAV filtrés avec types dynamiques
  const navigateToFilteredSAV = (filterType: string) => {
    const params = new URLSearchParams();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    switch (filterType) {
      case 'revenue':
        params.append('status', 'ready');
        params.append('month', currentMonth.toString());
        params.append('year', currentYear.toString());
        break;
      case 'takeover':
        // Rechercher le type 'client' ou utiliser le premier type disponible
        const clientType = getAllTypes().find(t => t.value === 'client');
        if (clientType) {
          params.append('sav_type', clientType.value);
        }
        params.append('taken_over', 'true');
        params.append('month', currentMonth.toString());
        params.append('year', currentYear.toString());
        break;
      default:
        // Pour les autres cas, utiliser le type tel quel
        const selectedType = getAllTypes().find(t => t.value === filterType);
        if (selectedType) {
          params.append('sav_type', selectedType.value);
        }
        params.append('month', currentMonth.toString());
        params.append('year', currentYear.toString());
        break;
    }
    
    navigate(`/sav?${params.toString()}`);
  };

  // Calculer les SAV concernés pour les tooltips (mois en cours) - données réelles
  const getSAVTooltipInfo = (filterType: string) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    switch (filterType) {
      case 'revenue':
        // SAV prêts non internes du mois
        const readySAVs = cases.filter(c => 
          c.status === 'ready' && 
          c.sav_type !== 'internal' &&
          new Date(c.created_at) >= monthStart && 
          new Date(c.created_at) <= monthEnd
        );
        return {
          count: readySAVs.length,
          description: `SAV prêts (hors internes) + devis acceptés ce mois`,
          cases: readySAVs,
          amount: costs.monthly_revenue
        };
      
      case 'takeover':
        // SAV client avec prise en charge totale ou partielle
        const takeoverSAVs = cases.filter(c => 
          c.sav_type === 'client' && 
          c.status === 'ready' &&
          (c.taken_over || c.partial_takeover) &&
          new Date(c.created_at) >= monthStart && 
          new Date(c.created_at) <= monthEnd
        );
        return {
          count: takeoverSAVs.length,
          description: `SAV client pris en charge (total ou partiel) ce mois`,
          cases: takeoverSAVs,
          amount: costs.takeover_cost
        };
      
      case 'internal':
        // SAV internes prêts
        const internalSAVs = cases.filter(c => 
          c.sav_type === 'internal' && 
          c.status === 'ready' &&
          new Date(c.created_at) >= monthStart && 
          new Date(c.created_at) <= monthEnd
        );
        return {
          count: internalSAVs.length,
          description: `SAV magasin (internes) prêts ce mois`,
          cases: internalSAVs,
          amount: costs.internal_cost
        };
      
      case 'client':
        // SAV client sans prise en charge
        const clientSAVs = cases.filter(c => 
          c.sav_type === 'client' && 
          c.status === 'ready' &&
          !c.taken_over && 
          !c.partial_takeover &&
          new Date(c.created_at) >= monthStart && 
          new Date(c.created_at) <= monthEnd
        );
        return {
          count: clientSAVs.length,
          description: `SAV client non pris en charge ce mois`,
          cases: clientSAVs,
          amount: costs.client_cost
        };
      
      default:
        return { count: 0, description: '', cases: [], amount: 0 };
    }
  };

  // Calculs pour les statistiques annuelles
  const yearlyStats = useMemo(() => {
    if (monthlyLoading) return {
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0,
      totalSavs: 0,
      avgMonthlySavs: 0
    };
    const totals = monthlyData.reduce((acc, month) => ({
      totalRevenue: acc.totalRevenue + month.revenue,
      totalCosts: acc.totalCosts + month.costs,
      totalProfit: acc.totalProfit + month.profit,
      totalSavs: acc.totalSavs + month.savCount
    }), {
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0,
      totalSavs: 0
    });
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
    return Math.min(storageGB / STORAGE_LIMIT_GB * 100, 100);
  }, [storageGB, storageLoading]);
  const storageChartData = useMemo(() => {
    if (storageLoading) return [];
    const usedGB = Math.min(storageGB, STORAGE_LIMIT_GB);
    const freeGB = Math.max(STORAGE_LIMIT_GB - storageGB, 0);
    return [{
      name: 'Espace utilisé',
      value: usedGB,
      color: storageUsagePercent > 80 ? '#ef4444' : '#3b82f6'
    }, {
      name: 'Espace libre',
      value: freeGB,
      color: '#e5e7eb'
    }];
  }, [storageGB, storageLoading, storageUsagePercent]);

  // Données pour le graphique de répartition des SAV avec types dynamiques
  const savDistributionData = useMemo(() => {
    const availableTypes = getAllTypes();
    
    return availableTypes.map(type => {
      const count = cases.filter(c => c.sav_type === type.value).length;
      return {
        name: type.label,
        value: count,
        color: type.color
      };
    }).filter(item => item.value > 0); // Ne montrer que les types avec des SAV
  }, [cases, getAllTypes]);

  // Données pour le graphique de rentabilité
  const profitabilityData = useMemo(() => {
    if (costsLoading) return [];
    const totalCosts = costs.takeover_cost + costs.client_cost + costs.external_cost + costs.internal_cost;
    const profit = costs.monthly_revenue - totalCosts;
    return [{
      name: 'Rentabilité',
      'Chiffre d\'affaires': costs.monthly_revenue,
      'Coûts': totalCosts,
      'Marge': profit
    }];
  }, [costs, costsLoading]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold">
          Tableau de bord SAV - {new Date().toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric'
        }).charAt(0).toUpperCase() + new Date().toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric'
        }).slice(1)}
        </h2>
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

      {/* Types de SAV avec navigation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-primary">Types de SAV - Répartition</CardTitle>
          <CardDescription>Cliquez sur un type pour voir la liste des SAV correspondants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {getAllTypes().map((type) => {
              const count = cases.filter(c => c.sav_type === type.value).length;
              const tooltipInfo = getSAVTooltipInfo(type.value);
              
              return (
                <TooltipProvider key={type.value}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card 
                        className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md border-l-4"
                        style={{ borderLeftColor: type.color }}
                        onClick={() => navigateToFilteredSAV(type.value)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: type.color }}
                              />
                              <span className="text-sm font-medium">{type.label}</span>
                            </div>
                            <span className="text-lg font-bold text-primary">{count}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">{tooltipInfo.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {tooltipInfo.count} SAV ce mois
                        </p>
                        {tooltipInfo.amount > 0 && (
                          <p className="text-sm font-medium text-green-600">
                            {tooltipInfo.amount.toFixed(2)} € de CA mensuel
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques financières mensuelles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md"
                onClick={() => navigateToFilteredSAV('revenue')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {costsLoading ? '...' : `${costs.monthly_revenue.toFixed(2)} €`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ce mois-ci
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>SAV prêts + devis acceptés ce mois</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coûts totaux</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {costsLoading ? '...' : `${(costs.takeover_cost + costs.client_cost + costs.external_cost + costs.internal_cost).toFixed(2)} €`}
            </div>
            <p className="text-xs text-muted-foreground">
              Ce mois-ci
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marge nette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${costsLoading ? '' : 
              (costs.monthly_revenue - (costs.takeover_cost + costs.client_cost + costs.external_cost + costs.internal_cost)) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {costsLoading ? '...' : `${(costs.monthly_revenue - (costs.takeover_cost + costs.client_cost + costs.external_cost + costs.internal_cost)).toFixed(2)} €`}
            </div>
            <p className="text-xs text-muted-foreground">
              Ce mois-ci
            </p>
          </CardContent>
        </Card>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md"
                onClick={() => navigateToFilteredSAV('takeover')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prises en charge</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {costsLoading ? '...' : `${costs.takeover_cost.toFixed(2)} €`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ce mois-ci
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>SAV client avec prise en charge totale ou partielle</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Graphiques et statistiques détaillées */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Stockage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Espace de stockage</CardTitle>
              <CardDescription>
                {storageLoading ? 'Chargement...' : `${(storageGB * 1024).toFixed(1)} MB utilisés sur ${STORAGE_LIMIT_GB * 1024} MB`}
              </CardDescription>
            </div>
            <HardDrive className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!storageLoading && (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Utilisation</span>
                    <span>{storageUsagePercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        storageUsagePercent > 80 ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${storageUsagePercent}%` }}
                    />
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={storageChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {storageChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        formatter={(value: any) => [`${(value).toFixed(3)} GB`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Répartition des types de SAV */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition des SAV</CardTitle>
            <CardDescription>Par type de service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={savDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {savDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rentabilité mensuelle */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Rentabilité mensuelle</CardTitle>
            <CardDescription>Chiffre d'affaires vs Coûts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitabilityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip formatter={(value) => [`${Number(value).toFixed(2)} €`, '']} />
                  <Legend />
                  <Bar dataKey="Chiffre d'affaires" fill="#22c55e" name="Chiffre d'affaires" />
                  <Bar dataKey="Coûts" fill="#ef4444" name="Coûts" />
                  <Bar dataKey="Marge" fill="#3b82f6" name="Marge" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques annuelles avec sélecteur d'année */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Statistiques annuelles</CardTitle>
            <CardDescription>Évolution mensuelle pour l'année sélectionnée</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {monthlyLoading ? '...' : `${yearlyStats.totalRevenue.toFixed(2)} €`}
              </div>
              <p className="text-sm text-muted-foreground">CA Total {selectedYear}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {monthlyLoading ? '...' : `${yearlyStats.totalCosts.toFixed(2)} €`}
              </div>
              <p className="text-sm text-muted-foreground">Coûts Total {selectedYear}</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${monthlyLoading ? '' : yearlyStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {monthlyLoading ? '...' : `${yearlyStats.totalProfit.toFixed(2)} €`}
              </div>
              <p className="text-sm text-muted-foreground">Marge Total {selectedYear}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {monthlyLoading ? '...' : yearlyStats.totalSavs}
              </div>
              <p className="text-sm text-muted-foreground">SAV Total {selectedYear}</p>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => format(new Date(selectedYear, value - 1), 'MMM')}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip 
                  labelFormatter={(value) => format(new Date(selectedYear, Number(value) - 1), 'MMMM yyyy')}
                  formatter={(value: any, name: string) => {
                    if (name === 'Nombre de SAV') {
                      return [value, name];
                    }
                    return [`${Number(value).toFixed(2)} €`, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#22c55e" name="Chiffre d'affaires" />
                <Bar yAxisId="left" dataKey="costs" fill="#ef4444" name="Coûts" />
                <Line yAxisId="right" type="monotone" dataKey="savCount" stroke="#8884d8" strokeWidth={2} name="Nombre de SAV" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
