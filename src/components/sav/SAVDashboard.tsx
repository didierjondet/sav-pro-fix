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

      {/* Types de SAV */}
      <Card>
        <CardHeader>
          <CardTitle>Types de SAV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savDistributionData.map((type, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="font-medium">{type.name}</span>
                </div>
                <span className="text-lg font-bold">{type.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
