import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { CustomerActivityDialog } from '@/components/customers/CustomerActivityDialog';
import { DuplicateManager } from '@/components/customers/DuplicateManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useAllCustomers } from '@/hooks/useAllCustomers';
import type { Customer } from '@/hooks/useCustomers';
import { useCustomerActivity } from '@/hooks/useCustomerActivity';
import { useCustomerSAVs } from '@/hooks/useCustomerSAVs';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { multiWordSearch } from '@/utils/searchUtils';
import { 
  User,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Eye,
  Euro,
  TrendingUp,
  Search,
  Users,
  AlertTriangle
} from 'lucide-react';

export default function Customers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  const { customers, loading, refetch } = useAllCustomers();
  const { shop } = useShop();
  const { toast } = useToast();
  
  // Filtrage côté client avec multiWordSearch (comme SAVList)
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    
    return customers.filter(customer =>
      multiWordSearch(
        searchTerm,
        customer.first_name,
        customer.last_name,
        customer.email,
        customer.phone,
        customer.address
      )
    );
  }, [customers, searchTerm]);

  // Pagination après filtrage
  const totalFilteredCount = filteredCustomers.length;
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCreateCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const dataWithShop = {
        ...customerData,
        shop_id: shop?.id || ''
      };
      
      const { data, error } = await supabase
        .from('customers')
        .insert([dataWithShop])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Client créé avec succès",
      });

      refetch();
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const handleUpdateCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingCustomer) return { error: 'No customer selected' };
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', editingCustomer.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Client mis à jour avec succès",
      });

      refetch();
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deletingCustomer.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Client supprimé avec succès",
      });

      refetch();
      setDeletingCustomer(null);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
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

  if (showForm || editingCustomer) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <CustomerForm
                customer={editingCustomer || undefined}
                onSubmit={editingCustomer ? handleUpdateCustomer : handleCreateCustomer}
                onCancel={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                }}
                isEdit={!!editingCustomer}
              />
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
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold">Gestion des clients</h1>
                  <Badge variant="secondary" className="text-base">
                    <Users className="h-4 w-4 mr-2" />
                    {customers.length} client{customers.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowDuplicateManager(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Gérer les doublons
                  </Button>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un client
                  </Button>
                </div>
              </div>

              {/* Champ de recherche */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Rechercher un client (nom, prénom, email, téléphone)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

          <div className="grid gap-4">
            {filteredCustomers.length === 0 && !searchTerm ? (
              <Card>
                <CardContent className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun client enregistré</p>
                  <Button className="mt-4" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter le premier client
                  </Button>
                </CardContent>
              </Card>
            ) : filteredCustomers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun client trouvé pour "{searchTerm}"</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {paginatedCustomers.map((customer) => {
                  return (
                    <CustomerCard 
                      key={customer.id} 
                      customer={customer} 
                      onEdit={setEditingCustomer}
                      onDelete={setDeletingCustomer}
                      onView={setViewingCustomer}
                    />
                  );
                })}
                
                {/* Pagination - show when there are results */}
                {totalFilteredCount > 0 && totalPages > 1 && (
                  <div className="mt-6">
                    <PaginationControls
                      currentPage={currentPage}
                      totalItems={totalFilteredCount}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={(value) => {
                        setItemsPerPage(value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le client "{deletingCustomer?.last_name?.toUpperCase()} {deletingCustomer?.first_name}" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog d'activité client */}
      <CustomerActivityDialog
        customer={viewingCustomer}
        open={!!viewingCustomer}
        onOpenChange={() => setViewingCustomer(null)}
      />

      {/* Gestionnaire de doublons */}
      <DuplicateManager
        customers={customers}
        open={showDuplicateManager}
        onOpenChange={setShowDuplicateManager}
        onMergeComplete={refetch}
      />
    </div>
  );
}

// Composant CustomerCard avec CA
function CustomerCard({ customer, onEdit, onDelete, onView }: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onView: (customer: Customer) => void;
}) {
  const { stats } = useCustomerActivity(customer.id);
  const { activeSAVCount } = useCustomerSAVs(customer.id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h3 className="font-semibold text-lg">
                {customer.last_name?.toUpperCase()} {customer.first_name}
              </h3>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-green-600">
                  <Euro className="h-3 w-3 mr-1" />
                  CA: {stats.total_revenue.toFixed(2)}€
                </Badge>
                {activeSAVCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {activeSAVCount} SAV en cours
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{customer.address}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={() => onView(customer)}>
              <Eye className="h-4 w-4 mr-1" />
              Voir
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(customer)}>
              <Edit className="h-4 w-4 mr-1" />
              Modifier
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className={activeSAVCount > 0 ? "text-muted-foreground cursor-not-allowed" : "text-destructive hover:text-destructive"}
              onClick={() => activeSAVCount === 0 && onDelete(customer)}
              disabled={activeSAVCount > 0}
              title={activeSAVCount > 0 ? "Impossible de supprimer : SAV en cours" : "Supprimer le client"}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}