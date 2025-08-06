import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { CustomerActivityDialog } from '@/components/customers/CustomerActivityDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { useCustomerActivity } from '@/hooks/useCustomerActivity';
import { useShop } from '@/hooks/useShop';
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
  TrendingUp
} from 'lucide-react';

export default function Customers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  
  const { customers, loading, createCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { shop } = useShop();

  const handleCreateCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    const dataWithShop = {
      ...customerData,
      shop_id: shop?.id || ''
    };
    return await createCustomer(dataWithShop);
  };

  const handleUpdateCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingCustomer) return { error: 'No customer selected' };
    return await updateCustomer(editingCustomer.id, customerData);
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    await deleteCustomer(deletingCustomer.id);
    setDeletingCustomer(null);
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
                <h1 className="text-2xl font-bold">Gestion des clients</h1>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un client
                </Button>
              </div>

          <div className="grid gap-4">
            {customers.length === 0 ? (
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
            ) : (
              customers.map((customer) => {
                return (
                  <CustomerCard 
                    key={customer.id} 
                    customer={customer} 
                    onEdit={setEditingCustomer}
                    onDelete={setDeletingCustomer}
                    onView={setViewingCustomer}
                  />
                );
              })
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
              Êtes-vous sûr de vouloir supprimer le client "{deletingCustomer?.first_name} {deletingCustomer?.last_name}" ? 
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h3 className="font-semibold text-lg">
                {customer.first_name} {customer.last_name}
              </h3>
              <Badge variant="outline" className="text-green-600">
                <Euro className="h-3 w-3 mr-1" />
                CA: {stats.total_revenue.toFixed(2)}€
              </Badge>
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
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(customer)}
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