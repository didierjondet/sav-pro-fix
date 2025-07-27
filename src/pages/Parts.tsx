import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParts } from '@/hooks/useParts';
import { 
  Package,
  Plus,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export default function Parts() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { parts, loading } = useParts();

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
                <h1 className="text-2xl font-bold">Stock des pièces détachées</h1>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une pièce
                </Button>
              </div>

          <div className="grid gap-4">
            {parts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune pièce en stock</p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter la première pièce
                  </Button>
                </CardContent>
              </Card>
            ) : (
              parts.map((part) => (
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
                          {part.quantity <= (part.min_stock || 5) && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Stock faible
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Quantité: </span>
                            <span className={part.quantity <= (part.min_stock || 5) ? 'text-red-600 font-medium' : ''}>
                              {part.quantity}
                            </span>
                          </div>
                          
                          <div>
                            <span className="font-medium">Prix d'achat: </span>
                            <span>{part.purchase_price}€</span>
                          </div>
                          
                          <div>
                            <span className="font-medium">Prix de vente: </span>
                            <span>{part.selling_price}€</span>
                          </div>
                          
                          <div>
                            <span className="font-medium">Stock min: </span>
                            <span>{part.min_stock}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
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
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}