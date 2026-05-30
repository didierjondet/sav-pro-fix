import { useState, useMemo, useEffect } from 'react';
import { multiWordSearch } from '@/utils/searchUtils';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParts, Part } from '@/hooks/useParts';
import { usePartCategories } from '@/hooks/usePartCategories';
import { useSuppliersDirectory } from '@/hooks/useSuppliersDirectory';
import { PartForm } from '@/components/parts/PartForm';
import { StockAdjustment } from '@/components/parts/StockAdjustment';
import { ImportStock } from '@/components/parts/ImportStock';
import { useMarketPrices, calculatePriceTrend } from '@/hooks/useMarketPrices';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Package,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye,
  Upload,
  Image as ImageIcon,
  Clock,
  ClipboardCheck,
  Wrench
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isPriceOutdated, getMonthsSinceUpdate } from '@/utils/priceUtils';
import { useLastInventoryByPart } from '@/hooks/useLastInventoryByPart';
import { useNavigate } from 'react-router-dom';

export default function Parts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'parts' | 'services'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showForm, setShowForm] = useState(false);
  const [creatingService, setCreatingService] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);
  const [adjustingPart, setAdjustingPart] = useState<Part | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<Part | null>(null);

  const { parts, loading, statistics, createPart, updatePart, deletePart, adjustStock, findSimilarParts, refetch } = useParts();
  const { categories } = usePartCategories();
  const { suppliers } = useSuppliersDirectory();
  const { lastInventoryByPart } = useLastInventoryByPart();
  const navigate = useNavigate();
  const categoryById = useMemo(() => {
    const map = new Map<string, typeof categories[number]>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);
  const supplierById = useMemo(() => {
    const map = new Map<string, typeof suppliers[number]>();
    suppliers.forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliers]);

  // Filtrage côté client (recherche + catégorie)
  const filteredParts = useMemo(() => {
    let list = parts;
    if (typeFilter === 'parts') {
      list = list.filter((p) => !(p as any).is_service);
    } else if (typeFilter === 'services') {
      list = list.filter((p) => !!(p as any).is_service);
    }
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'none') {
        list = list.filter((p) => !p.category_id);
      } else {
        list = list.filter((p) => p.category_id === categoryFilter);
      }
    }
    if (supplierFilter !== 'all') {
      if (supplierFilter === 'none') {
        list = list.filter((p) => !(p as any).supplier_id);
      } else {
        list = list.filter((p) => (p as any).supplier_id === supplierFilter);
      }
    }
    if (!searchTerm.trim()) return list;
    return list.filter(part =>
      multiWordSearch(searchTerm, part.name, part.reference, part.sku, part.supplier, part.notes)
    );
  }, [parts, searchTerm, categoryFilter, supplierFilter, typeFilter]);

  // Pagination après filtrage
  const displayedParts = filteredParts;
  const totalFilteredCount = filteredParts.length;
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParts = displayedParts.slice(startIndex, endIndex);

  // Réinitialiser la page quand la recherche change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Statistiques globales - basées sur toutes les pièces du shop
  const totalParts = statistics.totalQuantity;
  const totalValue = statistics.totalValue;
  const lowStockCount = statistics.lowStockCount;

  // Récupérer les prix du marché pour les pièces affichées
  const partNames = useMemo(() => paginatedParts.map(p => p.name), [paginatedParts]);
  const { marketPrices, loading: marketPricesLoading, isEnabled: marketPricesEnabled } = useMarketPrices(partNames);

  const handleCreatePart = async (data: any) => {
    return await createPart(data);
  };

  const handleUpdatePart = async (data: any) => {
    if (!editingPart) return { error: 'Aucune pièce sélectionnée' };
    return await updatePart(editingPart.id, data);
  };

  const handleDeletePart = async () => {
    if (!deletingPart) return;
    const { error } = await deletePart(deletingPart.id);
    if (!error) {
      setDeletingPart(null);
    }
  };

  const viewPartPhoto = async (part: Part) => {
    if (!part.photo_url) return;

    try {
      const { data: { signedUrl }, error } = await supabase.storage
        .from('part-photos')
        .createSignedUrl(part.photo_url, 3600); // 1 heure

      if (error) throw error;

      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing photo:', error);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center py-8">Chargement...</div>
            </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              {!showForm && !editingPart && !showImport ? (
                <>
                  <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                    <h1 className="text-2xl font-bold">Stock pièces & prestations</h1>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" onClick={() => setShowImport(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Importer CSV/Excel
                      </Button>
                      <Button variant="secondary" onClick={() => { setCreatingService(true); setShowForm(true); }}>
                        <Wrench className="h-4 w-4 mr-2" />
                        Ajouter une prestation
                      </Button>
                      <Button onClick={() => { setCreatingService(false); setShowForm(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une pièce
                      </Button>
                    </div>
                  </div>

                   {/* Statistiques */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Nombre d'articles</p>
                            <p className="text-2xl font-bold">{parts.length}</p>
                          </div>
                          <Package className="h-8 w-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Pièces en stock</p>
                            <p className="text-2xl font-bold">{totalParts}</p>
                          </div>
                          <BarChart3 className="h-8 w-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Valeur stock</p>
                            <p className="text-2xl font-bold">{totalValue.toFixed(2)}€</p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-yellow-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Barre de recherche + filtre catégorie */}
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Rechercher une pièce par nom ou référence..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                      <SelectTrigger className="sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Pièces & prestations</SelectItem>
                        <SelectItem value="parts">Pièces uniquement</SelectItem>
                        <SelectItem value="services">Prestations uniquement</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="sm:w-64">
                        <SelectValue placeholder="Toutes les catégories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les catégories</SelectItem>
                        <SelectItem value="none">Sans catégorie</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                      <SelectTrigger className="sm:w-56">
                        <SelectValue placeholder="Tous les fournisseurs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les fournisseurs</SelectItem>
                        <SelectItem value="none">Sans fournisseur</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                   {/* Liste des pièces */}
                   <div className="grid gap-4">
                     {paginatedParts.length === 0 ? (
                       <Card>
                         <CardContent className="text-center py-8">
                           <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                           <p className="text-muted-foreground">
                             {searchTerm ? 'Aucune pièce trouvée' : 'Aucune pièce en stock'}
                           </p>
                           {!searchTerm && (
                             <Button className="mt-4" onClick={() => setShowForm(true)}>
                               <Plus className="h-4 w-4 mr-2" />
                               Ajouter la première pièce
                             </Button>
                           )}
                         </CardContent>
                       </Card>
                       ) : (
                        paginatedParts.map((part) => (
                        <Card key={part.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                {/* Vignette de l'image */}
                                {part.photo_url && (
                                  <div className="w-16 h-16 flex-shrink-0">
                                    <img 
                                      src={`${supabase.storage.from('part-photos').getPublicUrl(part.photo_url).data.publicUrl}`}
                                      alt={part.name}
                                      className="w-full h-full object-cover rounded-md border border-gray-200 cursor-pointer"
                                      onClick={() => viewPartPhoto(part)}
                                      onError={(e) => {
                                        // Si l'image ne charge pas, la masquer
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-4 mb-2">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-lg">{part.name}</h3>
                                      {(part as any).is_service && (
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-300">
                                          <Wrench className="h-3 w-3 mr-1" /> Prestation
                                        </Badge>
                                      )}
                                      {part.photo_url && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => viewPartPhoto(part)}
                                          className="h-6 w-6 p-0 text-blue-600"
                                          title="Voir la photo en grand"
                                        >
                                          <ImageIcon className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                    {part.reference && (
                                      <Badge variant="outline">
                                        Réf: {part.reference}
                                      </Badge>
                                    )}
                                    <Select
                                      value={part.category_id ?? 'none'}
                                      onValueChange={async (value) => {
                                        await updatePart(part.id, { category_id: value === 'none' ? null : value });
                                      }}
                                    >
                                      <SelectTrigger
                                        className="h-7 w-auto min-w-[140px] gap-2 px-2 py-0 text-xs"
                                        style={
                                          part.category_id && categoryById.get(part.category_id)?.color
                                            ? {
                                                borderColor: categoryById.get(part.category_id)!.color!,
                                                color: categoryById.get(part.category_id)!.color!,
                                              }
                                            : undefined
                                        }
                                      >
                                        <SelectValue placeholder="Catégorie">
                                          {part.category_id && categoryById.get(part.category_id)
                                            ? categoryById.get(part.category_id)!.name
                                            : 'Sans catégorie'}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Sans catégorie</SelectItem>
                                        {categories.map((cat) => (
                                          <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {(part.reserved_quantity || 0) > 0 && (
                                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                                        Réservé: {part.reserved_quantity}
                                      </Badge>
                                    )}
                                    {part.quantity <= part.min_stock && (
                                      <Badge variant="destructive" className="flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Stock faible
                                      </Badge>
                                    )}
                                  </div>
                                  
                                   <div className="grid grid-cols-1 md:grid-cols-6 gap-4 text-sm text-muted-foreground">
                                     <div>
                                       <span className="font-medium">Stock total: </span>
                                       <span className={part.quantity <= part.min_stock ? 'text-red-600 font-medium' : ''}>
                                         {part.quantity}
                                       </span>
                                     </div>
                                     
                                     <div>
                                       <span className="font-medium">Disponible: </span>
                                       <span className="text-green-600 font-medium">
                                         {Math.max(0, part.quantity - (part.reserved_quantity || 0))}
                                       </span>
                                       {(part.reserved_quantity || 0) > 0 && (
                                         <div className="text-xs text-orange-600">
                                           ({part.reserved_quantity} réservé)
                                         </div>
                                       )}
                                     </div>
                                     
                                     <div>
                                       <span className="font-medium">Prix d'achat HT: </span>
                                       <span>{(part.purchase_price || 0).toFixed(2)}€</span>
                                     </div>
                                     
                                     <div>
                                       <span className="font-medium">Prix public TTC: </span>
                                       <span className="text-black text-lg font-bold">{(part.selling_price || 0).toFixed(2)}€</span>
                                       
                                       {/* Prix du marché IA */}
                                       {marketPricesEnabled && marketPrices[part.name] && (
                                         <div className="flex items-center gap-1 text-xs mt-1">
                                           {(() => {
                                             const marketPrice = marketPrices[part.name];
                                             const trend = calculatePriceTrend(part.selling_price || 0, marketPrice);
                                             return (
                                               <>
                                                 <BarChart3 className="h-3 w-3 text-muted-foreground" />
                                                 <span className="text-muted-foreground">Marché: ~{marketPrice}€</span>
                                                 <span 
                                                   className={
                                                     trend.direction === 'above' ? 'text-red-600' :
                                                     trend.direction === 'below' ? 'text-green-600' :
                                                     'text-muted-foreground'
                                                   }
                                                   title={
                                                     trend.direction === 'above' ? 'Votre prix est au-dessus du marché' :
                                                     trend.direction === 'below' ? 'Votre prix est en dessous du marché' :
                                                     'Votre prix est proche du marché'
                                                   }
                                                 >
                                                   {trend.icon} ({trend.percentage > 0 ? '+' : ''}{trend.percentage}%)
                                                 </span>
                                               </>
                                             );
                                           })()}
                                         </div>
                                       )}
                                     </div>
                                     
                                     <div>
                                       <span className="font-medium">Stock min: </span>
                                       <span>{part.min_stock}</span>
                                     </div>

                                     <div>
                                       <span className="font-medium">Valeur: </span>
                                       <span>{((part.purchase_price || 0) * part.quantity).toFixed(2)}€</span>
                                     </div>
                                   </div>
                                   
                                   {/* Alerte prix obsolète */}
                                   {isPriceOutdated(part.price_last_updated, 6) && (
                                     <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                                       <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                       <div className="text-sm text-amber-800">
                                         <span className="font-semibold">Prix obsolète : </span>
                                         <span>
                                           Le prix d'achat (HT) et/ou le prix public (TTC) n'ont pas été mis à jour depuis{' '}
                                           {getMonthsSinceUpdate(part.price_last_updated) === Infinity ? (
                                             <strong>leur création</strong>
                                           ) : (
                                             <strong>{getMonthsSinceUpdate(part.price_last_updated)} mois</strong>
                                           )}
                                           .{' '}Pensez à vérifier auprès de votre fournisseur.
                                         </span>
                                       </div>
                                     </div>
                                   )}
                                   
                                    {(() => {
                                      const sid = (part as any).supplier_id as string | null | undefined;
                                      const supName = sid ? supplierById.get(sid)?.name : null;
                                      const display = supName || part.supplier;
                                      if (!display) return null;
                                      return (
                                        <div className="mt-2 text-sm text-muted-foreground">
                                          <span className="font-medium">Fournisseur: </span>
                                          <span>{display}</span>
                                        </div>
                                      );
                                    })()}

                                    {(() => {
                                      const lastInv = lastInventoryByPart.get(part.id);
                                      return (
                                        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5">
                                          <ClipboardCheck className="h-3.5 w-3.5" />
                                          <span className="font-medium">Dernier inventaire: </span>
                                          {lastInv ? (
                                            <button
                                              type="button"
                                              onClick={() => navigate(`/inventory?session=${lastInv.sessionId}`)}
                                              className="text-primary hover:underline font-medium"
                                              title={`Voir la session : ${lastInv.sessionName}`}
                                            >
                                              {new Date(lastInv.lastCountedAt).toLocaleDateString('fr-FR')}
                                            </button>
                                          ) : (
                                            <span className="italic">Jamais inventoriée</span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                {!(part as any).is_service && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setAdjustingPart(part)}
                                  >
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    Stock
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setEditingPart(part)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Modifier
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeletingPart(part)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Supprimer
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        ))
                      )}
                   </div>

                   {/* Pagination - show when there are results */}
                   {totalFilteredCount > 0 && totalPages > 1 && (
                     <div className="mt-6">
                       <PaginationControls
                         totalItems={totalFilteredCount}
                         itemsPerPage={itemsPerPage}
                         currentPage={currentPage}
                         onPageChange={setCurrentPage}
                         onItemsPerPageChange={(value) => {
                           setItemsPerPage(value);
                           setCurrentPage(1);
                         }}
                       />
                     </div>
                   )}
                </>
              ) : showImport ? (
                <ImportStock
                  onBack={() => setShowImport(false)}
                  onRefresh={refetch}
                />
              ) : (
                <PartForm
                  initialData={editingPart || undefined}
                  onSubmit={editingPart ? handleUpdatePart : handleCreatePart}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingPart(null);
                    setCreatingService(false);
                  }}
                  isEdit={!!editingPart}
                  findSimilarParts={findSimilarParts}
                  defaultIsService={creatingService}
                />
              )}

              {/* Dialog de suppression */}
              <Dialog open={!!deletingPart} onOpenChange={() => setDeletingPart(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Supprimer la pièce</DialogTitle>
                    <DialogDescription>
                      Êtes-vous sûr de vouloir supprimer "{deletingPart?.name}" ? 
                      Cette action est irréversible.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeletingPart(null)}>
                      Annuler
                    </Button>
                    <Button variant="destructive" onClick={handleDeletePart}>
                      Supprimer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Dialog d'ajustement de stock */}
              {adjustingPart && (
                <StockAdjustment
                  part={adjustingPart}
                  isOpen={!!adjustingPart}
                  onClose={() => setAdjustingPart(null)}
                  onAdjust={adjustStock}
                />
              )}
            </div>
          </main>
  );
}