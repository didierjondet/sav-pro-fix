import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { multiWordSearch } from '@/utils/searchUtils';
import Header from '@/components/layout/Header';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSAVUnreadMessages } from '@/hooks/useSAVUnreadMessages';
import { useLimitDialogContext } from '@/contexts/LimitDialogContext';
import { supabase } from '@/integrations/supabase/client';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { SAVPrintButton } from '@/components/sav/SAVPrint';
import { SAVPrintFilterDialog } from '@/components/sav/SAVPrintFilterDialog';
import { PartStatusIcon } from '@/components/sav/PartStatusIcon';
import { SAVStatusDropdown } from '@/components/sav/SAVStatusDropdown';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SAVWizardDialog } from '@/components/sav/SAVWizardDialog';
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
  Hash,
  MessageCircle,
  LayoutGrid,
  LayoutList,
  RotateCcw
} from 'lucide-react';

const STORAGE_KEY = 'fixway_sav_filters';

const DEFAULT_FILTERS = {
  filterType: 'all',
  statusFilter: 'all',
  colorFilter: 'all',
  gradeFilter: 'all',
  sortOrder: 'priority',
  itemsPerPage: 20,
};

function loadSavedFilters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.savedDate !== today) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

const isFilterModified = (key: keyof typeof DEFAULT_FILTERS, value: string | number) => 
  value !== DEFAULT_FILTERS[key];

export default function SAVList() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const saved = useMemo(() => loadSavedFilters(), []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(saved?.filterType ?? DEFAULT_FILTERS.filterType);
  const [statusFilter, setStatusFilter] = useState(saved?.statusFilter ?? DEFAULT_FILTERS.statusFilter);
  const [colorFilter, setColorFilter] = useState(saved?.colorFilter ?? DEFAULT_FILTERS.colorFilter);
  const [gradeFilter, setGradeFilter] = useState(saved?.gradeFilter ?? DEFAULT_FILTERS.gradeFilter);
  const [sortOrder, setSortOrder] = useState(saved?.sortOrder ?? DEFAULT_FILTERS.sortOrder);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(saved?.itemsPerPage ?? DEFAULT_FILTERS.itemsPerPage);
  const [qrCodeCase, setQrCodeCase] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [viewMode, setViewMode] = useState<'standard' | 'compact'>(() => {
    return (localStorage.getItem('fixway_sav_view_mode') as 'standard' | 'compact') || 'standard';
  });
  const { cases, loading, deleteCase, refetch, updateCaseStatus } = useSAVCases();
  const { shop } = useShop();
  const { savWithUnreadMessages } = useSAVUnreadMessages();
  const { checkAndShowLimitDialog } = useLimitDialogContext();
  const { getStatusInfo, statuses, isReadyStatus, isCancelledStatus, isActiveStatus, isFinalStatus } = useShopSAVStatuses();
  const { getAllTypes, getTypeInfo, types } = useShopSAVTypes();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Les fonctions utilitaires sont maintenant disponibles via le hook useShopSAVStatuses

  // Initialiser les filtres à partir des paramètres URL
  useEffect(() => {
    const savType = searchParams.get('sav_type');
    const status = searchParams.get('status');
    const excludeReady = searchParams.get('exclude_ready');
    const takenOver = searchParams.get('taken_over');

    if (savType) {
      setFilterType(savType);
    }
    
    if (status) {
      setStatusFilter(status);
    } else if (excludeReady === 'true') {
      // Si exclude_ready est true, utiliser le filtre par défaut qui exclut les "prêts"
      setStatusFilter('all-except-ready');
    }
    
    if (takenOver === 'true') {
      // Pour les prises en charge, on peut ajouter une logique spécifique si nécessaire
      setStatusFilter('ready'); // Les prises en charge sont normalement des SAV prêts
    }
  }, [searchParams]);

  // Sauvegarder les filtres dans le localStorage à chaque changement
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      filterType,
      statusFilter,
      colorFilter,
      gradeFilter,
      sortOrder,
      itemsPerPage,
      savedDate: today,
    }));
  }, [filterType, statusFilter, colorFilter, gradeFilter, sortOrder, itemsPerPage]);

  const resetFilters = useCallback(() => {
    setFilterType(DEFAULT_FILTERS.filterType);
    setStatusFilter(DEFAULT_FILTERS.statusFilter);
    setColorFilter(DEFAULT_FILTERS.colorFilter);
    setGradeFilter(DEFAULT_FILTERS.gradeFilter);
    setSortOrder(DEFAULT_FILTERS.sortOrder);
    setItemsPerPage(DEFAULT_FILTERS.itemsPerPage);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('Filtres réinitialisés');
  }, []);

  // Hook pour récupérer les visites des SAV
  const savCaseIds = useMemo(() => cases?.map(c => c.id) || [], [cases]);
  const { getVisitCount, loading: visitsLoading, refetch: refetchVisits } = useSAVVisits(savCaseIds);

  // Mise à jour en temps réel des statuts SAV et des visites
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
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sav_tracking_visits'
        },
        (payload) => {
          console.log('New SAV visit recorded:', payload);
          refetchVisits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, refetchVisits]);

  const handleNewSAV = () => {
    if (checkAndShowLimitDialog('sav')) {
      const isSimplified = localStorage.getItem('fixway_simplified_view') === 'true';
      if (isSimplified) {
        setShowWizard(true);
      } else {
        navigate('/sav/new');
      }
    }
  };

  const handleStatusChange = async (caseId: string, newStatus: string) => {
    try {
      await updateCaseStatus(caseId, newStatus as any);
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  const handlePrintWithFilters = useCallback(async (selectedTypes: string[], printStatusFilter: string) => {
    // Recalculate filtered cases based on dialog selections
    const casesWithDelay = cases.map((case_) => ({
      ...case_,
      delayInfo: calculateSAVDelay(case_, shop, types)
    }));

    let filtered = casesWithDelay.filter(c => selectedTypes.includes(c.sav_type));

    if (printStatusFilter === 'all-except-ready') {
      filtered = filtered.filter(c => !isReadyStatus(c.status));
    } else if (printStatusFilter === 'overdue') {
      filtered = filtered.filter(c => c.delayInfo.isOverdue && c.status !== 'cancelled' && !isReadyStatus(c.status));
    } else if (printStatusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === printStatusFilter);
    }

    filtered.sort((a, b) => a.delayInfo.totalRemainingHours - b.delayInfo.totalRemainingHours);

    if (filtered.length === 0) {
      toast.error("Aucun dossier SAV à imprimer avec ces critères");
      return;
    }

    try {
      const result = await generateSAVListPDF(filtered, shop, {
        searchTerm: '',
        filterType: selectedTypes.length === types.length ? 'all' : selectedTypes.join(', '),
        statusFilter: printStatusFilter,
        sortOrder
      }, statuses, types);
      if (result) {
        toast.success("Ouverture de la boîte de dialogue d'impression...");
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la liste:', error);
      toast.error("Erreur lors de la génération du document");
    }
  }, [cases, shop, types, statuses, sortOrder, isReadyStatus]);

  // Calculer les informations de délai et appliquer filtres et tri
  const filteredAndSortedCases = useMemo(() => {
    // 1. Ajouter les informations de délai
    const casesWithDelay = cases.map((case_) => ({
      ...case_,
      delayInfo: calculateSAVDelay(case_, shop, types)
    }));

    let filtered = casesWithDelay;

    // 2. Filtrer par type de SAV avec types dynamiques
    if (filterType !== 'all') {
      if (filterType === 'shop') {
        filtered = filtered.filter(case_ => case_.sav_type === 'client' || case_.sav_type === 'external');
      } else {
        filtered = filtered.filter(case_ => case_.sav_type === filterType);
      }
    }

    // 3. Filtrer par statut
    if (statusFilter === 'all-except-ready') {
      filtered = filtered.filter(case_ => !isReadyStatus(case_.status));
    } else if (statusFilter === 'overdue') {
      filtered = filtered.filter(case_ => case_.delayInfo.isOverdue && case_.status !== 'cancelled' && !isReadyStatus(case_.status));
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(case_ => case_.status === statusFilter);
    }

    // 4. Filtrer par couleur
    if (colorFilter !== 'all') {
      filtered = filtered.filter(case_ => case_.device_color === colorFilter);
    }

    // 5. Filtrer par grade
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(case_ => case_.device_grade === gradeFilter);
    }

    // 6. Filtrer par recherche
    const filteredBySearch = filtered.filter(case_ =>
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
  }, [cases, shop, filterType, statusFilter, colorFilter, gradeFilter, sortOrder, searchTerm, types, getAllTypes, isReadyStatus]);

  // Calculs de pagination
  const totalItems = filteredAndSortedCases.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCases = filteredAndSortedCases.slice(startIndex, endIndex);

  // Réinitialiser la page quand les filtres changent
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, statusFilter, colorFilter, gradeFilter, sortOrder]);

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
                  <Button variant="outline" onClick={() => setShowPrintDialog(true)}>
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
                      <SelectTrigger className={cn("w-40", isFilterModified('filterType', filterType) && "ring-2 ring-orange-400 bg-orange-50")}>
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
                    <span className="text-sm font-medium">Couleur:</span>
                    <Select value={colorFilter} onValueChange={setColorFilter}>
                      <SelectTrigger className={cn("w-40", isFilterModified('colorFilter', colorFilter) && "ring-2 ring-orange-400 bg-orange-50")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="black">⚫ Noir</SelectItem>
                        <SelectItem value="white">⚪ Blanc</SelectItem>
                        <SelectItem value="grey">🔘 Gris</SelectItem>
                        <SelectItem value="blue">🔵 Bleu</SelectItem>
                        <SelectItem value="red">🔴 Rouge</SelectItem>
                        <SelectItem value="gold">🟡 Or</SelectItem>
                        <SelectItem value="silver">⚪ Argent</SelectItem>
                        <SelectItem value="green">🟢 Vert</SelectItem>
                        <SelectItem value="pink">🩷 Rose</SelectItem>
                        <SelectItem value="purple">🟣 Violet</SelectItem>
                        <SelectItem value="other">⚫ Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Grade:</span>
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger className={cn("w-32", isFilterModified('gradeFilter', gradeFilter) && "ring-2 ring-orange-400 bg-orange-50")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="A">Grade A</SelectItem>
                        <SelectItem value="B">Grade B</SelectItem>
                        <SelectItem value="C">Grade C</SelectItem>
                        <SelectItem value="D">Grade D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Statut:</span>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className={cn("w-48", isFilterModified('statusFilter', statusFilter) && "ring-2 ring-orange-400 bg-orange-50")}>
                        <SelectValue />
                      </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">Tous les statuts</SelectItem>
                         <SelectItem value="all-except-ready">Masquer les prêts</SelectItem>
                         <SelectItem value="overdue">En retard</SelectItem>
                         
                         {/* Statuts actifs (non finaux) */}
                         {statuses
                           .filter(status => status.is_active && !status.is_final_status)
                           .sort((a, b) => a.display_order - b.display_order)
                           .map(status => (
                             <SelectItem key={status.status_key} value={status.status_key}>
                               {status.status_label}
                             </SelectItem>
                           ))
                         }
                         
                         {/* Séparateur pour les statuts de clôture */}
                         {statuses.some(status => status.is_active && status.is_final_status) && (
                           <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 flex items-center gap-1">
                             <span>🏁</span> Statuts de clôture
                           </div>
                         )}
                         
                         {/* Statuts finaux avec style distinct */}
                         {statuses
                           .filter(status => status.is_active && status.is_final_status)
                           .sort((a, b) => a.display_order - b.display_order)
                           .map(status => (
                             <SelectItem 
                               key={status.status_key} 
                               value={status.status_key}
                               className="text-muted-foreground"
                             >
                               <span className="flex items-center gap-1.5">
                                 <span className="text-xs">🏁</span>
                                 <span className="italic">{status.status_label}</span>
                               </span>
                             </SelectItem>
                           ))
                         }
                       </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Tri:</span>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className={cn("w-48", isFilterModified('sortOrder', sortOrder) && "ring-2 ring-orange-400 bg-orange-50")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Par priorité</SelectItem>
                        <SelectItem value="oldest">Plus vieux en premier</SelectItem>
                        <SelectItem value="newest">Plus récent en premier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    title="Réinitialiser les filtres"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Réinitialiser
                  </Button>
                  
                  {/* Switch vue compacte + compteur */}
                  <div className="flex items-center gap-4 ml-auto">
                    <div className="flex items-center gap-2">
                      <LayoutList className="h-4 w-4 text-muted-foreground" />
                      <Switch
                        id="view-mode"
                        checked={viewMode === 'compact'}
                        onCheckedChange={(checked) => {
                          const mode = checked ? 'compact' : 'standard';
                          setViewMode(mode);
                          localStorage.setItem('fixway_sav_view_mode', mode);
                        }}
                      />
                      <Label htmlFor="view-mode" className="text-sm cursor-pointer">
                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      </Label>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {totalItems} dossier{totalItems > 1 ? 's' : ''} trouvé{totalItems > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

          <div className={viewMode === 'compact' ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "grid gap-4"}>
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
                const isHighPriority = !isUrgent && savCase.delayInfo.totalRemainingHours <= 24;
                const hasUnreadMessages = savWithUnreadMessages.some(sav => sav.id === savCase.id);
                
                const borderClass = isUrgent ? 'border-l-4 border-l-destructive' : 
                  isHighPriority ? 'border-l-4 border-l-orange-500' : '';

                if (viewMode === 'compact') {
                  const statusInfo = getStatusInfo(savCase.status);
                  const typeInfo = getTypeInfo(savCase.sav_type);
                  return (
                    <Card 
                      key={savCase.id} 
                      className={`hover:shadow-md transition-all cursor-pointer ${borderClass}`}
                      style={{ backgroundColor: `${typeInfo.color}15` }}
                      onClick={() => navigate(`/sav/${savCase.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {hasUnreadMessages && <MessageCircle className="h-4 w-4 text-blue-500 animate-pulse shrink-0" />}
                            <span className="font-semibold text-sm truncate">
                              {savCase.customer ? 
                                `${savCase.customer.last_name} ${savCase.customer.first_name}` : 
                                `#${savCase.case_number}`
                              }
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0 shrink-0"
                            style={statusInfo?.color ? { 
                              borderColor: statusInfo.color, 
                              color: statusInfo.color 
                            } : undefined}
                          >
                            {statusInfo?.label || savCase.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
                          <Package className="h-3 w-3 shrink-0" />
                          <span className="truncate">{savCase.device_brand} {savCase.device_model}</span>
                          <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                            N° {savCase.case_number}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0"
                            style={{ borderColor: typeInfo.color, color: typeInfo.color }}
                          >
                            {typeInfo.label}
                          </Badge>
                          <div className="flex items-center gap-3">
                            <span className={
                              isUrgent ? 'text-destructive font-semibold' :
                              isHighPriority ? 'text-orange-600 font-medium' : 'text-muted-foreground'
                            }>
                              <Clock className="h-3 w-3 inline mr-0.5" />
                              {formatDelayText(savCase.delayInfo)}
                            </span>
                            {!visitsLoading && (
                              <span className="text-muted-foreground">
                                <Eye className="h-3 w-3 inline mr-0.5" />
                                {getVisitCount(savCase.id)}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // Standard view
                const typeInfo = getTypeInfo(savCase.sav_type);
                
                return (
                <Card key={savCase.id} className={`hover:shadow-md transition-shadow ${borderClass}`} style={{ backgroundColor: `${typeInfo.color}15` }}>
                  <CardContent className="p-4 md:p-5">
                    <div className="flex flex-col gap-3">
                      {/* Ligne 1 : Identité (gauche) + Statut (droite) */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {hasUnreadMessages && <MessageCircle className="h-5 w-5 text-blue-500 animate-pulse shrink-0" />}
                          <PartStatusIcon 
                            key={`${savCase.id}-${savCase.status}-${savCase.updated_at}`}
                            savCaseId={savCase.id} 
                            savStatus={savCase.status} 
                          />
                          <h3 className="font-bold text-lg truncate">
                            {savCase.customer ? 
                              `${savCase.customer.last_name} ${savCase.customer.first_name}` : 
                              `#${savCase.case_number}`
                            }
                          </h3>
                          {savCase.customer?.phone && (
                            <a href={`tel:${savCase.customer.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary shrink-0">
                              <Phone className="h-4 w-4" />
                              <span className="text-sm font-medium tracking-wide">{savCase.customer.phone.replace(/\D/g, '').replace(/(\d{2})(?=\d)/g, '$1 ')}</span>
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {!(savCase.sav_type === 'internal' && !savCase.customer) && (
                            <span className="text-xs text-muted-foreground font-mono">N° {savCase.case_number}</span>
                          )}
                          <SAVStatusDropdown
                            currentStatus={savCase.status}
                            onStatusChange={(newStatus) => handleStatusChange(savCase.id, newStatus)}
                          />
                        </div>
                      </div>

                      {/* Ligne 2 : Appareil + IMEI */}
                      <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-4 w-4 shrink-0" />
                            <span>{savCase.device_brand} {savCase.device_model}</span>
                          </div>
                          {savCase.device_imei && (
                            <div className="flex items-center gap-1.5">
                              <Hash className="h-4 w-4 shrink-0" />
                              <span className="font-mono text-xs">{savCase.device_imei}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ligne 3 : Métadonnées */}
                      <div className="flex items-center flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">
                          📅 {format(new Date(savCase.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </Badge>
                        {isFinalStatus(savCase.status) && (() => {
                          const closureHistory = savCase.closure_history as any[] | null;
                          const lastClosure = closureHistory && closureHistory.length > 0 ? closureHistory[closureHistory.length - 1] : null;
                          const closureDate = lastClosure?.closed_at ? new Date(lastClosure.closed_at) : new Date(savCase.updated_at);
                          return (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Clôturé le {format(closureDate, 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </Badge>
                          );
                        })()}
                        <Badge variant="secondary" className={`text-xs ${
                          isUrgent ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          isHighPriority ? 'bg-orange-100 text-orange-700 border-orange-200' : ''
                        }`}>
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDelayText(savCase.delayInfo)}
                        </Badge>
                        {!visitsLoading && (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            {getVisitCount(savCase.id)} visite{getVisitCount(savCase.id) > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {savCase.sku && (
                          <Badge variant="secondary" className="text-xs font-mono">
                            SKU: {savCase.sku}
                          </Badge>
                        )}
                      </div>

                      {/* Ligne 4 : Description */}
                      {savCase.problem_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {savCase.problem_description}
                        </p>
                      )}

                      {/* Ligne 5 : Timeline */}
                      <div className="pt-2 border-t border-border/30">
                        <SAVTimeline savCase={savCase} shop={shop} />
                      </div>

                      {/* Ligne 6 : Type SAV (bas gauche) + Actions (bas droite) */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 flex-wrap">
                        <Badge 
                          variant="outline"
                          style={{ borderColor: typeInfo.color, color: typeInfo.color }}
                        >
                          {typeInfo.label}
                        </Badge>
                        <div className="flex items-center gap-2 flex-wrap">
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
      <SAVPrintFilterDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onPrint={handlePrintWithFilters}
      />
      <SAVWizardDialog
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={() => refetch()}
      />
    </div>
  );
}