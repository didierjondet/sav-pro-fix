import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { multiWordSearch } from '@/utils/searchUtils';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SAVDashboard } from '@/components/sav/SAVDashboard';
import { SAVTimeline } from '@/components/sav/SAVTimeline';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShop } from '@/hooks/useShop';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useSAVVisits } from '@/hooks/useSAVVisits';
import { generateSAVListPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';
import { formatDelayText, calculateSAVDelay } from '@/hooks/useSAVDelay';
import { useSAVUnreadMessages } from '@/hooks/useSAVUnreadMessages';
import { useLimitDialogContext } from '@/contexts/LimitDialogContext';
import { supabase } from '@/integrations/supabase/client';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { SAVPrintButton } from '@/components/sav/SAVPrint';
import { PartStatusIcon } from '@/components/sav/PartStatusIcon';
import { 
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  User,
  Trash2,
  Printer,
  MessageSquare,
  Search,
  Filter,
  Phone,
  MessageCircle
} from 'lucide-react';

export default function SAVList() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'client', 'internal', etc.
  const [statusFilter, setStatusFilter] = useState('all-except-ready'); // Par défaut, masquer les SAV prêts
  const [sortOrder, setSortOrder] = useState('priority'); // 'priority', 'oldest', 'newest'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [qrCodeCase, setQrCodeCase] = useState(null);
  const { cases, loading, deleteCase, refetch } = useSAVCases();
  const { shop } = useShop();
  const { savWithUnreadMessages } = useSAVUnreadMessages();
  const { checkAndShowLimitDialog } = useLimitDialogContext();
  const { getStatusInfo, statuses } = useShopSAVStatuses();
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();
  const navigate = useNavigate();

  // Hook pour récupérer les visites des SAV
  const savCaseIds = useMemo(() => cases?.map(c => c.id) || [], [cases]);
  const { getVisitCount, loading: visitsLoading } = useSAVVisits(savCaseIds);

  // Mise à jour en temps réel des statuts SAV
  useEffect(() => {
    const channel = supabase
      .channel('sav-list-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sav_cases'
        },
        (payload) => {
          console.log('SAV case status updated:', payload);
          // Refetch les données pour avoir les dernières mises à jour
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleNewSAV = () => {
    if (checkAndShowLimitDialog('sav')) {
      navigate('/sav/new');
    }
  };

  const printSAVList = async () => {
    if (filteredAndSortedCases.length === 0) {
      toast.error("Aucun dossier SAV à imprimer selon les filtres appliqués");
      return;
    }

    try {
      const result = await generateSAVListPDF(filteredAndSortedCases, shop, {
        searchTerm,
        filterType,
        statusFilter,
        sortOrder
      }, statuses);
      if (result) {
        toast.success("Ouverture de la boîte de dialogue d'impression...");
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la liste:', error);
      toast.error("Erreur lors de la génération du document");
    }
  };

  // Calculer les informations de délai et appliquer filtres et tri
  const filteredAndSortedCases = useMemo(() => {
    // 1. Ajouter les informations de délai
    const casesWithDelay = cases.map((case_) => ({
      ...case_,
      delayInfo: calculateSAVDelay(case_, shop)
    }));

    // 2. Filtrer par type de SAV avec types dynamiques
    let filteredByType = casesWithDelay;
    const availableTypes = getAllTypes();
    
    if (filterType !== 'all') {
      if (filterType === 'shop') {
        // Regrouper SAV client et externes sous "SAV CLIENTS (INTERNE+EXTERNE)"
        filteredByType = casesWithDelay.filter(case_ => case_.sav_type === 'client' || case_.sav_type === 'external');
      } else {
        // Filtrer par type spécifique
        filteredByType = casesWithDelay.filter(case_ => case_.sav_type === filterType);
      }
    }

    // 3. Filtrer par statut
    let filteredByStatus = filteredByType;
    if (statusFilter === 'all-except-ready') {
      filteredByStatus = filteredByType.filter(case_ => case_.status !== 'ready');
    } else if (statusFilter === 'overdue') {
      filteredByStatus = filteredByType.filter(case_ => case_.delayInfo.isOverdue && case_.status !== 'cancelled' && case_.status !== 'ready');
    } else if (statusFilter !== 'all') {
      filteredByStatus = filteredByType.filter(case_ => case_.status === statusFilter);
    }

    // 4. Filtrer par recherche
    const filteredBySearch = filteredByStatus.filter(case_ =>
      multiWordSearch(
        searchTerm, 
        case_.customer?.first_name, 
        case_.customer?.last_name, 
        case_.case_number, 
        case_.device_brand,
        case_.device_model,
        case_.device_imei,
        case_.sku,
        case_.problem_description
      )
    );

    // 5. Appliquer le tri
    return filteredBySearch.sort((a, b) => {
      if (sortOrder === 'oldest') {
        // Trier par temps restant croissant (le moins de temps restant en premier = plus vieux/urgent)
        return a.delayInfo.totalRemainingHours - b.delayInfo.totalRemainingHours;
      } else if (sortOrder === 'newest') {
        // Trier du plus récent au plus vieux (par date de création)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        // Tri par priorité : tous les SAV du plus vieux au plus récent (par temps restant croissant)
        return a.delayInfo.totalRemainingHours - b.delayInfo.totalRemainingHours;
      }
    });
  }, [cases, shop, filterType, statusFilter, sortOrder, searchTerm]);

  // Calculs de pagination
  const totalItems = filteredAndSortedCases.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCases = filteredAndSortedCases.slice(startIndex, endIndex);

  // Réinitialiser la page quand les filtres changent
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, statusFilter, sortOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center py-8">Chargement...</div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Dossiers SAV</h1>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={printSAVList}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer liste
                  </Button>
                  <Button onClick={handleNewSAV}>
                    Nouveau dossier SAV
                  </Button>
                </div>
              </div>

              {/* Barre de recherche et filtres */}
              <div className="mb-6 space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Rechercher un dossier, client, appareil..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Filtres et tri */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Type:</span>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                        <SelectContent>
                         <SelectItem value="all">Tous les SAV</SelectItem>
                         {getAllTypes().map(type => (
                           <SelectItem key={type.value} value={type.value}>
                             {type.label}
                           </SelectItem>
                         ))}
                         <SelectItem value="shop">SAV CLIENTS (INTERNE+EXTERNE)</SelectItem>
                       </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Statut:</span>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">Tous les statuts</SelectItem>
                         <SelectItem value="all-except-ready">Masquer les prêts</SelectItem>
                         <SelectItem value="overdue">En retard</SelectItem>
                         {statuses
                           .filter(status => status.is_active)
                           .sort((a, b) => a.display_order - b.display_order)
                           .map(status => (
                             <SelectItem key={status.status_key} value={status.status_key}>
                               {status.status_label}
                             </SelectItem>
                           ))
                         }
                       </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Tri:</span>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Par priorité</SelectItem>
                        <SelectItem value="oldest">Plus vieux en premier</SelectItem>
                        <SelectItem value="newest">Plus récent en premier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Compteur de résultats */}
                  <div className="text-sm text-muted-foreground ml-auto">
                    {totalItems} dossier{totalItems > 1 ? 's' : ''} trouvé{totalItems > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

          <div className="grid gap-4">
            {totalItems === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm || filterType !== 'all' ? 'Aucun dossier trouvé pour cette recherche/filtre' : 'Aucun dossier SAV trouvé'}
                  </p>
                  {!searchTerm && filterType === 'all' && (
                    <Button className="mt-4" onClick={handleNewSAV}>
                      Créer le premier dossier
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              paginatedCases.map((savCase) => {
                const isUrgent = savCase.delayInfo.isOverdue;
                const isHighPriority = !isUrgent && savCase.delayInfo.totalRemainingHours <= 24; // Moins de 24h restantes
                
                // Vérifier s'il y a des messages non lus pour ce SAV
                const hasUnreadMessages = savWithUnreadMessages.some(sav => sav.id === savCase.id);
                
                // Couleurs de fond selon le type de SAV
                // SAV clients : fond rouge, SAV magasin et externes : fond bleu (même présentation)
                const backgroundClass = savCase.sav_type === 'client' ? 'bg-red-50' : 'bg-sky-50';
                
                const cardClassName = `hover:shadow-md transition-shadow ${backgroundClass} ${
                  isUrgent ? 'border-l-4 border-l-red-500' : 
                  isHighPriority ? 'border-l-4 border-l-orange-500' : ''
                }`;
                
                return (
                <Card key={savCase.id} className={cardClassName}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            {hasUnreadMessages && <MessageCircle className="h-5 w-5 text-blue-500 animate-pulse" />}
                            <PartStatusIcon 
                              key={`${savCase.id}-${savCase.status}-${savCase.updated_at}`}
                              savCaseId={savCase.id} 
                              savStatus={savCase.status} 
                            />
                            <h3 className="font-bold text-xl">
                              {savCase.customer ? 
                                `${savCase.customer.last_name} ${savCase.customer.first_name}` : 
                                (savCase.sav_type === 'internal' ? `#${savCase.case_number}` : 'Client non défini')
                              }
                            </h3>
                            {/* Affichage du nombre de visites */}
                            {!visitsLoading && (
                              <Badge variant="secondary" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                {getVisitCount(savCase.id)} visite{getVisitCount(savCase.id) > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <Badge style={getStatusInfo(savCase.status).color ? {
                            backgroundColor: `${getStatusInfo(savCase.status).color}20`,
                            color: getStatusInfo(savCase.status).color,
                            borderColor: getStatusInfo(savCase.status).color
                          } : undefined}>
                            {getStatusInfo(savCase.status).label}
                          </Badge>
                           <Badge variant="outline" className={
                             savCase.sav_type === 'client' ? 'border-red-200 text-red-700' : 'border-blue-200 text-blue-700'
                           }>
                             {getTypeInfo(savCase.sav_type).label}
                           </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>{savCase.device_brand} {savCase.device_model}</span>
                          </div>
                          
                          {savCase.device_imei && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span className="font-mono text-xs">{savCase.device_imei}</span>
                            </div>
                          )}
                          
                          {savCase.sku && (
                            <div className="flex items-center gap-2">
                              <span className="h-4 w-4 text-center text-xs font-semibold">#</span>
                              <span className="font-mono text-xs">{savCase.sku}</span>
                            </div>
                          )}
                          
                          {savCase.sku && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                SKU: {savCase.sku}
                              </Badge>
                            </div>
                          )}
                          
                           {/* N° SAV seulement si pas déjà affiché en titre (SAV interne sans client) */}
                           {!(savCase.sav_type === 'internal' && !savCase.customer) && (
                             <div className="flex items-center gap-2">
                               <span className="text-xs text-muted-foreground">N° {savCase.case_number}</span>
                             </div>
                           )}
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className={
                              isUrgent ? 'text-red-600 font-semibold' :
                              isHighPriority ? 'text-orange-600 font-medium' : ''
                            }>
                              {formatDelayText(savCase.delayInfo)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="mt-2 text-sm line-clamp-2">
                          {savCase.problem_description}
                        </p>
                        
                        {/* Timeline SAV */}
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <SAVTimeline savCase={savCase} shop={shop} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/sav/${savCase.id}`)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                        
                        <SAVPrintButton 
                          savCase={savCase}
                          variant="outline"
                          size="sm"
                        />
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer ce dossier SAV ?')) {
                              deleteCase(savCase.id);
                            }
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })
            )}
            
            {/* Pagination */}
            {totalItems > 0 && (
              <div className="mt-6">
                <PaginationControls
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>
            )}
          </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}