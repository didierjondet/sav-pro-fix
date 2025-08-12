import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SAVForm } from './SAVForm';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShop } from '@/hooks/useShop';
import { useSAVPartsCosts } from '@/hooks/useSAVPartsCosts';
import { calculateSAVDelay } from '@/hooks/useSAVDelay';
import { format, differenceInHours } from 'date-fns';
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
  const navigate = useNavigate();

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

  // Données pour le graphique temps passé par produit
  const timeSpentData = useMemo(() => {
    const completedCases = cases.filter(c => c.status === 'cancelled');
    
    return completedCases.map(case_ => {
      const createdAt = new Date(case_.created_at);
      const updatedAt = new Date(case_.updated_at);
      const hoursSpent = differenceInHours(updatedAt, createdAt);
      
      return {
        name: `${case_.device_brand} ${case_.device_model}`.substring(0, 20),
        caseNumber: case_.case_number,
        hours: Math.max(hoursSpent, 1) // Minimum 1 heure pour l'affichage
      };
    }).sort((a, b) => new Date(a.caseNumber).getTime() - new Date(b.caseNumber).getTime());
  }, [cases]);
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
            <CardTitle>Temps passé par produit</CardTitle>
            <CardDescription>
              Évolution du temps de traitement des SAV terminés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Chargement...</div>
              </div>
            ) : timeSpentData.length === 0 ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Aucun SAV terminé pour afficher les données</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSpentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="caseNumber" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis 
                    label={{ value: 'Heures', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value} heures`,
                      'Temps passé'
                    ]}
                    labelFormatter={(label) => `SAV: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>;
}