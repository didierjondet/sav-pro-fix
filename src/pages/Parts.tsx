import { useState, useMemo, useEffect } from 'react';
import { multiWordSearch } from '@/utils/searchUtils';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useParts, Part } from '@/hooks/useParts';
import { PartForm } from '@/components/parts/PartForm';
import { StockAdjustment } from '@/components/parts/StockAdjustment';
import { ImportStock } from '@/components/parts/ImportStock';
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
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isPriceOutdated, getMonthsSinceUpdate } from '@/utils/priceUtils';

export default function Parts() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);
  const [adjustingPart, setAdjustingPart] = useState<Part | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<Part | null>(null);
  
  const { parts, loading, statistics, createPart, updatePart, deletePart, adjustStock, findSimilarParts, refetch } = useParts();

  // Filtrage côté client avec multiWordSearch (comme SAVList)
  const filteredParts = useMemo(() => {
    if (!searchTerm.trim()) return parts;
    
    return parts.filter(part =>
      multiWordSearch(
        searchTerm,
        part.name,
        part.reference,
        part.sku,
        part.supplier,
        part.notes
      )
    );
  }, [parts, searchTerm]);

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
              {!showForm && !editingPart && !showImport ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Gestion des stocks</h1>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowImport(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Importer CSV/Excel
                      </Button>
                      <Button onClick={() => setShowForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une pièce
                      </Button>
                    </div>
                  </div>

                   {/* Statistiques */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

                  {/* Barre de recherche */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Rechercher une pièce par nom ou référence..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
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
                                   
                                   {part.supplier && (
                                     <div className="mt-2 text-sm text-muted-foreground">
                                       <span className="font-medium">Fournisseur: </span>
                                       <span>{part.supplier}</span>
                                     </div>
                                   )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setAdjustingPart(part)}
                                >
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  Stock
                                </Button>
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
                  }}
                  isEdit={!!editingPart}
                  findSimilarParts={findSimilarParts}
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
        </div>
      </div>
    </div>
  );
}