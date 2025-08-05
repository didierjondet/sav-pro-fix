import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { multiWordSearch } from '@/utils/searchUtils';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, MessageCircleWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SAVForm } from './SAVForm';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useQuotes } from '@/hooks/useQuotes';
import { useShop } from '@/hooks/useShop';
import { useSAVPartsCosts } from '@/hooks/useSAVPartsCosts';
import { useSAVUnreadMessages } from '@/hooks/useSAVUnreadMessages';
import { formatDelayText, DelayInfo, calculateSAVDelay } from '@/hooks/useSAVDelay';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const {
    cases,
    loading,
    updateCaseStatus,
    deleteCase
  } = useSAVCases();
  const {
    quotes
  } = useQuotes();
  const {
    shop
  } = useShop();
  const {
    costs,
    loading: costsLoading
  } = useSAVPartsCosts();
  const {
    savWithUnreadMessages
  } = useSAVUnreadMessages();
  const navigate = useNavigate();

  // Calculer les informations de délai pour tous les cas et trier par priorité
  const casesWithDelayInfo = useMemo(() => {
    const casesWithDelay = cases.map(case_ => ({
      ...case_,
      delayInfo: calculateSAVDelay(case_, shop)
    }));

    // Trier par priorité : 
    // 1. SAV en retard (isOverdue = true) en premier
    // 2. Ensuite par temps restant croissant (le moins de temps restant en premier)
    // 3. Enfin les SAV livrés ou annulés à la fin
    return casesWithDelay.sort((a, b) => {
      // Les SAV annulés vont à la fin
      const aCompleted = a.status === 'cancelled';
      const bCompleted = b.status === 'cancelled';
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && bCompleted) return 0; // Garder l'ordre existant pour les complétés

      // Pour les SAV actifs, trier par urgence
      // 1. SAV en retard en premier
      if (a.delayInfo.isOverdue && !b.delayInfo.isOverdue) return -1;
      if (!a.delayInfo.isOverdue && b.delayInfo.isOverdue) return 1;

      // 2. Si les deux sont en retard ou non en retard, trier par temps restant
      return a.delayInfo.totalRemainingHours - b.delayInfo.totalRemainingHours;
    });
  }, [cases, shop]);
  const filteredCases = casesWithDelayInfo.filter(case_ => multiWordSearch(searchTerm, case_.customer?.first_name, case_.customer?.last_name, case_.case_number, case_.device_brand, case_.device_model));
  return <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un dossier..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtres
          </Button>
        </div>
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
            <div className={`text-2xl font-bold ${!costsLoading && costs.monthly_revenue - costs.takeover_cost - costs.internal_cost - costs.client_cost < 0 ? 'text-destructive' : 'text-primary'}`}>
              {costsLoading ? '...' : (costs.monthly_revenue - costs.takeover_cost - costs.internal_cost - costs.client_cost).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">CA - Coûts totaux</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dossiers SAV récents</CardTitle>
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
          <CardDescription>
            Gérez vos dossiers de réparation et leur statut
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8">Chargement des dossiers...</div> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Dossier</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Appareil / IMEI</TableHead>
                  <TableHead>Statut / Délai</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map(case_ => {
              // Couleurs de fond selon le type de SAV
              const backgroundClass = case_.sav_type === 'client' ? 'bg-red-50' : 'bg-sky-50';

              // Vérifier s'il y a des messages non lus pour ce SAV
              const unreadMessages = savWithUnreadMessages.find(sav => sav.id === case_.id);
              return <TableRow key={case_.id} className={cn(backgroundClass, case_.delayInfo.isOverdue && case_.status !== 'cancelled' ? "border-destructive/20 bg-red-100" : "")}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {case_.case_number}
                        {unreadMessages && <MessageCircleWarning className="h-4 w-4 text-orange-500 animate-pulse" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      {case_.customer ? `${case_.customer.first_name} ${case_.customer.last_name}` : 'SAV Interne'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{case_.device_brand} {case_.device_model}</span>
                        {case_.device_imei && <span className="text-xs text-muted-foreground">IMEI: {case_.device_imei}</span>}
                        {case_.sku && <span className="text-xs text-muted-foreground">SKU: {case_.sku}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={statusConfig[case_.status].variant}>
                          {statusConfig[case_.status].label}
                        </Badge>
                        {case_.status !== 'cancelled' && <span className={cn("text-xs", case_.delayInfo.isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                            {formatDelayText(case_.delayInfo)}
                          </span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(case_.created_at), 'dd/MM/yyyy', {
                    locale: fr
                  })}
                    </TableCell>
                    <TableCell>{(case_.total_cost || 0).toFixed(2)}€</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/sav/${case_.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/sav/${case_.id}`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer ce dossier SAV ?')) {
                          deleteCase(case_.id);
                        }
                      }}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>;
            })}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>
    </div>;
}