import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrders } from '@/hooks/useOrders';
import { 
  Package, 
  Search, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  X,
  Printer
} from 'lucide-react';

export default function Orders() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'sav' | 'quotes'>('sav');
  
  const { orderItems, loading, markAsOrdered, removeFromOrder, getOrdersByFilter } = useOrders();

  const filteredItems = getOrdersByFilter(activeFilter).filter(item =>
    item.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.part_reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Urgent';
      case 'medium': return 'Normal';
      case 'low': return 'Faible';
      default: return priority;
    }
  };

  const getReasonText = (reason: string) => {
    switch (reason) {
      case 'sav_stock_zero': return 'SAV - Stock épuisé';
      case 'quote_needed': return 'Devis en cours';
      case 'manual': return 'Réapprovisionnement';
      default: return reason;
    }
  };

  const getEmptyMessage = () => {
    switch (activeFilter) {
      case 'sav': return 'Aucune pièce manquante pour les SAV';
      case 'quotes': return 'Aucune pièce manquante pour les devis';
      case 'all': return 'Aucune pièce en dessous du stock minimum';
      default: return 'Aucune pièce trouvée';
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('order-list');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Liste des commandes</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .priority-high { background-color: #fee2e2; }
              .priority-medium { background-color: #f3f4f6; }
              .priority-low { background-color: #f0f9ff; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Liste des Pièces à Commander</h1>
              <p>Date: ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Pièce</th>
                  <th>Référence</th>
                  <th>Quantité</th>
                  <th>Priorité</th>
                  <th>Raison</th>
                </tr>
              </thead>
              <tbody>
                ${filteredItems.map(item => `
                  <tr class="priority-${item.priority}">
                    <td>${item.part_name}</td>
                    <td>${item.part_reference || '-'}</td>
                    <td>${item.quantity_needed}</td>
                    <td>${getPriorityText(item.priority)}</td>
                    <td>${getReasonText(item.reason)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      }
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
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Gestion des Commandes</h1>
                <Button onClick={handlePrint} className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimer la liste
                </Button>
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

              {/* Filtres */}
              <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)} className="mb-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="sav">SAV</TabsTrigger>
                  <TabsTrigger value="quotes">Devis</TabsTrigger>
                  <TabsTrigger value="all">Stock minimum</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Liste des commandes */}
              <div id="order-list">
                {filteredItems.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'Aucune pièce trouvée' : getEmptyMessage()}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredItems.map((item) => (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <h3 className="font-semibold text-lg">{item.part_name}</h3>
                                {item.part_reference && (
                                  <Badge variant="outline">
                                    Réf: {item.part_reference}
                                  </Badge>
                                )}
                                <Badge variant={getPriorityColor(item.priority)}>
                                  {getPriorityText(item.priority)}
                                </Badge>
                                {item.ordered && (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    Commandé
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Quantité: </span>
                                  <span className="text-lg font-bold text-foreground">
                                    {item.quantity_needed}
                                  </span>
                                </div>
                                
                                <div>
                                  <span className="font-medium">Raison: </span>
                                  <span>{getReasonText(item.reason)}</span>
                                </div>
                                
                                <div>
                                  <span className="font-medium">Créé le: </span>
                                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>

                              {item.part && (
                                <div className="mt-3 text-sm">
                                  <div className="mb-1">
                                    <span className="font-medium text-muted-foreground">Stock actuel: </span>
                                    <span className={`text-xl font-bold ${item.part.quantity === 0 ? 'text-red-600' : 'text-foreground'}`}>
                                      {item.part.quantity}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Stock minimum: </span>
                                    <span className="text-sm text-muted-foreground">
                                      {item.part.min_stock}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {!item.ordered && (
                              <div className="flex items-center gap-2 ml-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => markAsOrdered(item.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Commandé
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => removeFromOrder(item.id)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Retirer
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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