import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
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
  Upload
} from 'lucide-react';

export default function Parts() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);
  const [adjustingPart, setAdjustingPart] = useState<Part | null>(null);
  const [showImport, setShowImport] = useState(false);
  
  const { parts, loading, createPart, updatePart, deletePart, adjustStock, refetch } = useParts();

  const filteredParts = parts.filter(part =>
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (part.reference && part.reference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const lowStockParts = parts.filter(part => (part.quantity || 0) <= (part.min_stock || 0));
  const totalValue = parts.reduce((sum, part) => sum + ((part.purchase_price || 0) * (part.quantity || 0)), 0);
  const totalParts = parts.reduce((sum, part) => sum + (part.quantity || 0), 0);

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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Quantité totale</p>
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
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Stocks faibles</p>
                            <p className="text-2xl font-bold text-red-600">{lowStockParts.length}</p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-red-600" />
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

                  {/* Alerte stocks faibles */}
                  {lowStockParts.length > 0 && (
                    <Card className="mb-6 border-yellow-200 bg-yellow-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-medium">
                            {lowStockParts.length} pièce(s) en stock faible
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Liste des pièces */}
                  <div className="grid gap-4">
                    {filteredParts.length === 0 ? (
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
                      filteredParts.map((part) => (
                        <Card key={part.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-4 mb-2">
                                  <h3 className="font-semibold text-lg">{part.name}</h3>
                                  {part.reference && (
                                    <Badge variant="outline">
                                      Réf: {part.reference}
                                    </Badge>
                                  )}
                                  {part.quantity <= part.min_stock && (
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Stock faible
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm text-muted-foreground">
                                  <div>
                                    <span className="font-medium">Quantité: </span>
                                    <span className={part.quantity <= part.min_stock ? 'text-red-600 font-medium' : ''}>
                                      {part.quantity}
                                    </span>
                                  </div>
                                  
                                  <div>
                                    <span className="font-medium">Prix d'achat: </span>
                                    <span>{(part.purchase_price || 0).toFixed(2)}€</span>
                                  </div>
                                  
                                  <div>
                                    <span className="font-medium">Prix de vente: </span>
                                    <span>{(part.selling_price || 0).toFixed(2)}€</span>
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