import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Store, 
  Plus,
  Edit,
  Trash2,
  Crown,
  AlertTriangle,
  Search,
  HardDrive,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ShopManagementDialog from '@/components/admin/ShopManagementDialog';

interface Shop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  invite_code: string;
  logo_url: string;
  website_enabled: boolean;
  website_title: string;
  website_description: string;
  max_sav_processing_days_client: number;
  max_sav_processing_days_internal: number;
  slug: string;
  subscription_tier: string;
  subscription_plan_id?: string;
  sms_credits_allocated: number;
  sms_credits_used: number;
  active_sav_count: number;
  subscription_menu_visible: boolean;
  created_at: string;
  purchased_sms: number;
  total_users?: number;
  total_sav_cases?: number;
  pending_cases?: number;
  in_progress_cases?: number;
  ready_cases?: number;
  delivered_cases?: number;
  total_revenue?: number;
  average_case_value?: number;
  is_blocked?: boolean;
  storage_gb?: number;
}

interface ShopsManagementProps {
  shops: Shop[];
  onUpdate: () => void;
}

export function ShopsManagement({ shops, onUpdate }: ShopsManagementProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateShopOpen, setIsCreateShopOpen] = useState(false);
  const [isEditShopOpen, setIsEditShopOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isShopManagementOpen, setIsShopManagementOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  
  const [newShop, setNewShop] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Filter shops based on search term
  const filteredShops = shops.filter(shop => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in shop name
    if (shop.name.toLowerCase().includes(searchLower)) return true;
    
    // Search in address (for postal code)
    if (shop.address?.toLowerCase().includes(searchLower)) return true;
    
    // Search in email
    if (shop.email?.toLowerCase().includes(searchLower)) return true;
    
    return false;
  });

  const createShop = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .insert([newShop])
        .select()
        .single();

      if (error) throw error;

      onUpdate();
      setIsCreateShopOpen(false);
      setNewShop({ name: '', email: '', phone: '', address: '' });
      
      toast({
        title: "Succès",
        description: "Magasin créé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const editShop = (shop: Shop) => {
    setEditingShop(shop);
    setNewShop({
      name: shop.name,
      email: shop.email || '',
      phone: shop.phone || '',
      address: shop.address || ''
    });
    setIsEditShopOpen(true);
  };

  const openShopManagement = (shop: Shop) => {
    setSelectedShop(shop);
    setIsShopManagementOpen(true);
  };

  const updateShop = async () => {
    if (!editingShop) return;
    
    try {
      const { data, error } = await supabase
        .from('shops')
        .update(newShop)
        .eq('id', editingShop.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate();
      setIsEditShopOpen(false);
      setEditingShop(null);
      setNewShop({ name: '', email: '', phone: '', address: '' });
      
      toast({
        title: "Succès",
        description: "Magasin mis à jour avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteShop = async (shopId: string) => {
    try {
      console.log('Starting shop deletion for ID:', shopId);
      
      // D'abord récupérer tous les sav_cases pour ce magasin
      console.log('Fetching sav_cases for shop', shopId);
      const { data: savCases, error: fetchError } = await supabase
        .from('sav_cases')
        .select('id')
        .eq('shop_id', shopId);

      if (fetchError) {
        console.error('Error fetching sav_cases:', fetchError);
        throw fetchError;
      }

      const savCaseIds = savCases?.map(sc => sc.id) || [];
      console.log('Found sav_cases:', savCaseIds);

      // Supprimer sav_parts qui référencent ces sav_cases
      if (savCaseIds.length > 0) {
        console.log('Deleting sav_parts for sav_cases', savCaseIds);
        const { error: savPartsError } = await supabase
          .from('sav_parts')
          .delete()
          .in('sav_case_id', savCaseIds);
        
        if (savPartsError) {
          console.error('Error deleting sav_parts:', savPartsError);
          throw savPartsError;
        }

        // Supprimer sav_status_history qui référencent ces sav_cases
        console.log('Deleting sav_status_history for sav_cases', savCaseIds);
        const { error: savStatusError } = await supabase
          .from('sav_status_history')
          .delete()
          .in('sav_case_id', savCaseIds);
        
        if (savStatusError) {
          console.error('Error deleting sav_status_history:', savStatusError);
          throw savStatusError;
        }
      }

      // Supprimer tous les autres éléments liés...
      const tablesToClean = [
        'parts' as const, 
        'customers' as const, 
        'quotes' as const, 
        'order_items' as const, 
        'notifications' as const, 
        'sav_messages' as const, 
        'sav_cases' as const, 
        'profiles' as const
      ] as const;

      for (const table of tablesToClean) {
        console.log(`Deleting ${table} for shop`, shopId);
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('shop_id', shopId);

        if (error) {
          console.error(`Error deleting ${table}:`, error);
          throw error;
        }
      }

      // Enfin supprimer le magasin lui-même
      console.log('Deleting shop', shopId);
      const { error: shopError } = await supabase
        .from('shops')
        .delete()
        .eq('id', shopId);

      if (shopError) {
        console.error('Error deleting shop:', shopError);
        throw shopError;
      }

      console.log('Shop deletion completed successfully');
      onUpdate();
      
      toast({
        title: "Succès",
        description: "Magasin et toutes ses données supprimés",
      });
      
    } catch (error: any) {
      console.error('Deletion error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Store className="h-5 w-5" />
              Gestion des Magasins
            </CardTitle>
            <Dialog open={isCreateShopOpen} onOpenChange={setIsCreateShopOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un magasin
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Créer un nouveau magasin</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Créez un nouveau magasin pour un client.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="shop-name" className="text-white">Nom du magasin</Label>
                    <Input
                      id="shop-name"
                      value={newShop.name}
                      onChange={(e) => setNewShop({...newShop, name: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shop-email" className="text-white">Email</Label>
                    <Input
                      id="shop-email"
                      type="email"
                      value={newShop.email}
                      onChange={(e) => setNewShop({...newShop, email: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shop-phone" className="text-white">Téléphone</Label>
                    <Input
                      id="shop-phone"
                      value={newShop.phone}
                      onChange={(e) => setNewShop({...newShop, phone: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shop-address" className="text-white">Adresse</Label>
                    <Textarea
                      id="shop-address"
                      value={newShop.address}
                      onChange={(e) => setNewShop({...newShop, address: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateShopOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={createShop} className="bg-emerald-600 hover:bg-emerald-700">
                    Créer le magasin
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog pour modifier un magasin */}
            <Dialog open={isEditShopOpen} onOpenChange={setIsEditShopOpen}>
              <DialogContent className="bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Modifier le magasin</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Modifiez les informations du magasin.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-shop-name" className="text-white">Nom du magasin</Label>
                    <Input
                      id="edit-shop-name"
                      value={newShop.name}
                      onChange={(e) => setNewShop({...newShop, name: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-shop-email" className="text-white">Email</Label>
                    <Input
                      id="edit-shop-email"
                      type="email"
                      value={newShop.email}
                      onChange={(e) => setNewShop({...newShop, email: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-shop-phone" className="text-white">Téléphone</Label>
                    <Input
                      id="edit-shop-phone"
                      value={newShop.phone}
                      onChange={(e) => setNewShop({...newShop, phone: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-shop-address" className="text-white">Adresse</Label>
                    <Textarea
                      id="edit-shop-address"
                      value={newShop.address}
                      onChange={(e) => setNewShop({...newShop, address: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditShopOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={updateShop} className="bg-emerald-600 hover:bg-emerald-700">
                    Sauvegarder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search field */}
          <div className="mt-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Rechercher par nom, code postal ou administrateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {filteredShops.length === 0 && searchTerm ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun magasin trouvé pour "{searchTerm}"</p>
              </div>
            ) : (
              filteredShops.map((shop) => (
              <Card key={shop.id} className="bg-white border-slate-200 hover:shadow-md transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg text-slate-900">{shop.name}</h3>
                        <Badge variant="outline" className="border-emerald-600 text-emerald-700">
                          {shop.total_users} utilisateur(s)
                        </Badge>
                        <Badge variant="outline" className="border-blue-600 text-blue-700">
                          {shop.total_sav_cases} dossier(s) SAV
                        </Badge>
                        {shop.storage_gb && shop.storage_gb > 0 && (
                          <Badge variant="outline" className="border-purple-600 text-purple-700">
                            <HardDrive className="h-3 w-3 mr-1" />
                            {shop.storage_gb} GB
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-2">
                        <div className="text-slate-700">
                          <span className="font-medium">Email: </span>
                          <span>{shop.email}</span>
                        </div>
                        <div className="text-slate-700">
                          <span className="font-medium">Téléphone: </span>
                          <span>{shop.phone}</span>
                        </div>
                        <div className="text-slate-700">
                          <span className="font-medium">CA: </span>
                          <span>{shop.total_revenue?.toFixed(2)}€</span>
                        </div>
                      </div>
                      
                      {shop.slug && (
                        <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-lg">
                          <div className="flex-1">
                            <span className="font-medium text-sm text-slate-700">URL du magasin: </span>
                            <a 
                              href={`${window.location.origin}/${shop.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 font-mono text-sm"
                            >
                              {window.location.origin}/{shop.slug}
                            </a>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-slate-300 text-slate-700 hover:bg-slate-100"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/${shop.slug}`);
                              toast({
                                title: "Copié !",
                                description: "L'URL a été copiée dans le presse-papiers",
                              });
                            }}
                          >
                            Copier
                          </Button>
                        </div>
                      )}
                    </div>
                    
                     <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-300 text-slate-700 hover:bg-slate-100"
                        onClick={() => openShopManagement(shop)}
                      >
                        <Crown className="h-4 w-4 mr-1" />
                        Gérer
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-300 text-slate-700 hover:bg-slate-100"
                        onClick={() => editShop(shop)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white border-red-200">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-slate-900 flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                              Supprimer le magasin "{shop.name}"
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600">
                              <div className="space-y-2">
                                <p>Cette action est irréversible et supprimera définitivement :</p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  <li>Le magasin et ses informations</li>
                                  <li>Tous les utilisateurs associés ({shop.total_users})</li>
                                  <li>Tous les dossiers SAV ({shop.total_sav_cases})</li>
                                  <li>Tous les articles et stocks</li>
                                  <li>Tous les clients et devis</li>
                                  <li>Toutes les notifications et messages</li>
                                </ul>
                                <p className="font-medium text-red-600 mt-3">
                                  Voulez-vous vraiment continuer ?
                                </p>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200">
                              Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteShop(shop.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Supprimer définitivement
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de gestion du magasin */}
      <ShopManagementDialog
        shop={selectedShop}
        isOpen={isShopManagementOpen}
        onClose={() => setIsShopManagementOpen(false)}
        onUpdate={onUpdate}
      />
    </div>
  );
}