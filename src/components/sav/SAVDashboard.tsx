import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { multiWordSearch } from '@/utils/searchUtils';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, MessageCircleWarning } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { ReviewRequestButton } from './ReviewRequestButton';
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
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'client' | 'internal' | 'external'
  const [statusFilter, setStatusFilter] = useState('all-except-ready'); // Par défaut, masquer les SAV prêts
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
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
  const filteredCases = casesWithDelayInfo.filter(case_ => {
    // Filtrage par recherche textuelle
    const matchesSearch = multiWordSearch(searchTerm, case_.customer?.first_name, case_.customer?.last_name, case_.case_number, case_.device_brand, case_.device_model);
    
    // Filtrage par type
    let matchesType = true;
    if (typeFilter !== 'all') {
      matchesType = case_.sav_type === typeFilter;
    }

    // Filtrage par statut
    let matchesStatus = true;
    if (statusFilter === 'all-except-ready') {
      matchesStatus = case_.status !== 'ready';
    } else if (statusFilter === 'overdue') {
      matchesStatus = case_.delayInfo.isOverdue && case_.status !== 'cancelled';
    } else if (statusFilter !== 'all') {
      matchesStatus = case_.status === statusFilter;
    }
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculs de pagination
  const totalItems = filteredCases.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCases = filteredCases.slice(startIndex, endIndex);

  // Réinitialiser la page quand les filtres changent
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter]);
  return <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un dossier..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
          </div>
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
            <div className={`text-2xl font-bold ${!costsLoading && (costs.monthly_revenue - costs.takeover_cost - costs.client_cost - costs.external_cost) < 0 ? 'text-destructive' : 'text-primary'}`}>
              {costsLoading ? '...' : (costs.monthly_revenue - costs.takeover_cost - costs.client_cost - costs.external_cost).toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground">CA - Coûts (hors interne)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dossiers SAV récents</CardTitle>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="client">SAV Client</SelectItem>
                  <SelectItem value="internal">SAV Magasin</SelectItem>
                  <SelectItem value="external">SAV Externe</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="all-except-ready">Masquer les prêts</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="testing">En test</SelectItem>
                  <SelectItem value="parts_ordered">Pièces commandées</SelectItem>
                  <SelectItem value="ready">Prêt</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
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
                {paginatedCases.map(case_ => {
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
                      <div className="flex items-center justify-end gap-2">
                        {case_.status === 'ready' && (
                          <ReviewRequestButton
                            savCaseId={case_.id}
                            shopId={case_.shop_id}
                            customerName={case_.customer ? `${case_.customer.first_name} ${case_.customer.last_name}`.trim() : ''}
                            caseNumber={case_.case_number}
                          />
                        )}
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
                      </div>
                    </TableCell>
                  </TableRow>;
            })}
              </TableBody>
            </Table>}
          
          {totalItems > 0 && (
            <div className="mt-4">
              <PaginationControls
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>;
}