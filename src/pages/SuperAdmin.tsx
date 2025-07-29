import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Store, 
  Users, 
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Crown,
  Shield,
  TrendingUp,
  Activity,
  DollarSign,
  Unlock,
  MessageSquare,
  AlertTriangle,
  Zap,
  Globe
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
import ShopManagementDialog from '@/components/admin/ShopManagementDialog';
import SubscriptionPlansManager from '@/components/admin/SubscriptionPlansManager';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Shop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  slug: string;
  sms_credits: number;
  subscription_tier: string;
  sms_credits_allocated: number;
  sms_credits_used: number;
  active_sav_count: number;
  created_at: string;
  total_users?: number;
  total_sav_cases?: number;
  pending_cases?: number;
  in_progress_cases?: number;
  ready_cases?: number;
  delivered_cases?: number;
  total_revenue?: number;
  average_case_value?: number;
  is_blocked?: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  shop_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'admin' | 'technician' | 'super_admin' | 'shop_admin';
  created_at: string;
  shop?: {
    name: string;
    email: string;
  };
}

export default function SuperAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreateShopOpen, setIsCreateShopOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditShopOpen, setIsEditShopOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isShopManagementOpen, setIsShopManagementOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  
  const [newShop, setNewShop] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    sms_credits: 100
  });
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'admin' as 'admin' | 'technician' | 'super_admin' | 'shop_admin',
    shop_id: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch shops
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false });

      if (shopsError) throw shopsError;

      // Fetch profiles count for each shop
      const { data: profilesCount, error: profilesCountError } = await supabase
        .from('profiles')
        .select('shop_id')
        .not('shop_id', 'is', null);

      if (profilesCountError) throw profilesCountError;

      // Fetch SAV cases for statistics
      const { data: savCasesData, error: savCasesError } = await supabase
        .from('sav_cases')
        .select('shop_id, status, total_cost');

      if (savCasesError) throw savCasesError;

      // Process shop statistics
      const shopsWithStats = shopsData?.map(shop => {
        const shopProfiles = profilesCount?.filter(p => p.shop_id === shop.id) || [];
        const shopSavCases = savCasesData?.filter(sc => sc.shop_id === shop.id) || [];
        
        return {
          ...shop,
          total_users: shopProfiles.length,
          total_sav_cases: shopSavCases.length,
          pending_cases: shopSavCases.filter(c => c.status === 'pending').length,
          in_progress_cases: shopSavCases.filter(c => c.status === 'in_progress').length,
          ready_cases: shopSavCases.filter(c => c.status === 'ready').length,
          delivered_cases: shopSavCases.filter(c => c.status === 'delivered').length,
          total_revenue: shopSavCases.reduce((sum, c) => sum + (c.total_cost || 0), 0),
          average_case_value: shopSavCases.length > 0 
            ? shopSavCases.reduce((sum, c) => sum + (c.total_cost || 0), 0) / shopSavCases.length 
            : 0
        };
      }) || [];

      setShops(shopsWithStats);

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          shops!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      
      // Transform the data to match expected format
      const transformedProfiles = profilesData?.map(profile => ({
        ...profile,
        shop: profile.shops ? { name: profile.shops.name, email: profile.shops.email } : undefined
      })) || [];
      
      setProfiles(transformedProfiles);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les données: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createShop = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .insert([newShop])
        .select()
        .single();

      if (error) throw error;

      setShops([...shops, data]);
      setIsCreateShopOpen(false);
      setNewShop({ name: '', email: '', phone: '', address: '', sms_credits: 100 });
      
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
      address: shop.address || '',
      sms_credits: shop.sms_credits
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

      setShops(shops.map(shop => shop.id === editingShop.id ? { ...shop, ...data } : shop));
      setIsEditShopOpen(false);
      setEditingShop(null);
      setNewShop({ name: '', email: '', phone: '', address: '', sms_credits: 100 });
      
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

      // Supprimer parts
      console.log('Deleting parts for shop', shopId);
      const { error: partsError } = await supabase
        .from('parts')
        .delete()
        .eq('shop_id', shopId);

      if (partsError) {
        console.error('Error deleting parts:', partsError);
        throw partsError;
      }

      // Supprimer customers
      console.log('Deleting customers for shop', shopId);
      const { error: customersError } = await supabase
        .from('customers')
        .delete()
        .eq('shop_id', shopId);

      if (customersError) {
        console.error('Error deleting customers:', customersError);
        throw customersError;
      }

      // Supprimer quotes
      console.log('Deleting quotes for shop', shopId);
      const { error: quotesError } = await supabase
        .from('quotes')
        .delete()
        .eq('shop_id', shopId);

      if (quotesError) {
        console.error('Error deleting quotes:', quotesError);
        throw quotesError;
      }

      // Supprimer order_items
      console.log('Deleting order_items for shop', shopId);
      const { error: orderItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('shop_id', shopId);

      if (orderItemsError) {
        console.error('Error deleting order_items:', orderItemsError);
        throw orderItemsError;
      }

      // Supprimer notifications
      console.log('Deleting notifications for shop', shopId);
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('shop_id', shopId);

      if (notificationsError) {
        console.error('Error deleting notifications:', notificationsError);
        throw notificationsError;
      }

      // Supprimer sav_messages
      console.log('Deleting sav_messages for shop', shopId);
      const { error: messagesError } = await supabase
        .from('sav_messages')
        .delete()
        .eq('shop_id', shopId);

      if (messagesError) {
        console.error('Error deleting sav_messages:', messagesError);
        throw messagesError;
      }

      // Supprimer sav_cases
      console.log('Deleting sav_cases for shop', shopId);
      const { error: savCasesError } = await supabase
        .from('sav_cases')
        .delete()
        .eq('shop_id', shopId);

      if (savCasesError) {
        console.error('Error deleting sav_cases:', savCasesError);
        throw savCasesError;
      }

      // Supprimer profiles
      console.log('Deleting profiles for shop', shopId);
      const { error: profilesError } = await supabase
        .from('profiles')
        .delete()
        .eq('shop_id', shopId);

      if (profilesError) {
        console.error('Error deleting profiles:', profilesError);
        throw profilesError;
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

      // Vérifier que le magasin a bien été supprimé
      const { data: verificationData, error: verificationError } = await supabase
        .from('shops')
        .select('id')
        .eq('id', shopId);

      if (verificationError) {
        console.error('Error verifying deletion:', verificationError);
        throw verificationError;
      }

      if (verificationData && verificationData.length > 0) {
        throw new Error('Le magasin n\'a pas été supprimé correctement');
      }

      console.log('Shop deletion completed successfully');

      // Mettre à jour l'état local uniquement après confirmation de la suppression
      setShops(shops.filter(shop => shop.id !== shopId));
      
      toast({
        title: "Succès",
        description: "Magasin et toutes ses données supprimés",
      });

      // Recharger les données après un délai pour s'assurer de la cohérence
      setTimeout(() => {
        fetchData();
      }, 1000);
      
    } catch (error: any) {
      console.error('Deletion error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const createUser = async () => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          user_id: authData.user.id,
          shop_id: newUser.shop_id,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          phone: newUser.phone,
          role: newUser.role
        }]);

      if (profileError) throw profileError;

      await fetchData();
      setIsCreateUserOpen(false);
      setNewUser({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'admin',
        shop_id: ''
      });
      
      toast({
        title: "Succès",
        description: "Utilisateur créé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (profileId: string, userId: string) => {
    try {
      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (profileError) throw profileError;

      // Delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      setProfiles(profiles.filter(profile => profile.id !== profileId));
      
      toast({
        title: "Succès",
        description: "Utilisateur supprimé",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addSmsCredits = async (shopId: string, additionalCredits: number) => {
    try {
      const shop = shops.find(s => s.id === shopId);
      if (!shop) throw new Error("Magasin non trouvé");

      const { error } = await supabase
        .from('shops')
        .update({ 
          sms_credits_allocated: shop.sms_credits_allocated + additionalCredits 
        })
        .eq('id', shopId);

      if (error) throw error;

      await fetchData();
      
      toast({
        title: "Succès",
        description: `${additionalCredits} crédits SMS ajoutés`,
      });
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-700 text-lg">Chargement du panneau Super Admin...</p>
        </div>
      </div>
    );
  }

  const totalStats = {
    totalShops: shops.length,
    totalUsers: profiles.length,
    totalRevenue: shops.reduce((sum, shop) => sum + (shop.total_revenue || 0), 0),
    totalCases: shops.reduce((sum, shop) => sum + (shop.total_sav_cases || 0), 0)
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header spécial Super Admin */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary rounded-xl shadow-lg">
                <Crown className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="h-6 w-6" />
                  Super Administration
                </h1>
                <p className="text-slate-600">Panneau de contrôle réseau SAV Pro</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-slate-900 font-medium">{user?.email}</p>
                <p className="text-xs text-primary flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Super Administrateur
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => window.location.href = '/landing'}
              >
                Retour Landing
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <div>
              <h2 className="text-4xl font-bold text-slate-900">Administration du Réseau</h2>
              <p className="text-xl text-slate-600">Gestion centralisée de tous les magasins et utilisateurs</p>
            </div>
          </div>
        </div>

        {/* Dashboard Overview - Design distinctif */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-medium">Total Magasins</p>
                  <p className="text-3xl font-bold text-slate-900">{totalStats.totalShops}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Store className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-medium">Total Utilisateurs</p>
                  <p className="text-3xl font-bold text-slate-900">{totalStats.totalUsers}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <Users className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-medium">Chiffre d'affaires</p>
                  <p className="text-3xl font-bold text-slate-900">{totalStats.totalRevenue.toFixed(2)}€</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-medium">Total Dossiers SAV</p>
                  <p className="text-3xl font-bold text-slate-900">{totalStats.totalCases}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="shops" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border-slate-200">
            <TabsTrigger value="shops" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <Store className="h-4 w-4" />
              Gestion Magasins
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <Users className="h-4 w-4" />
              Gestion Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <Crown className="h-4 w-4" />
              Plans d'abonnement
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </TabsTrigger>
          </TabsList>

          {/* Shops Management */}
          <TabsContent value="shops">
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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shops.map((shop) => (
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
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Users className="h-5 w-5" />
                    Gestion des Utilisateurs
                  </CardTitle>
                  <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Créer un utilisateur
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                        <DialogDescription className="text-slate-300">
                          Créez un nouvel utilisateur et assignez-le à un magasin.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="user-email" className="text-white">Email</Label>
                          <Input
                            id="user-email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="user-password" className="text-white">Mot de passe</Label>
                          <Input
                            id="user-password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="user-firstname" className="text-white">Prénom</Label>
                            <Input
                              id="user-firstname"
                              value={newUser.first_name}
                              onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                              className="bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                          <div>
                            <Label htmlFor="user-lastname" className="text-white">Nom</Label>
                            <Input
                              id="user-lastname"
                              value={newUser.last_name}
                              onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                              className="bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="user-shop" className="text-white">Magasin</Label>
                          <Select value={newUser.shop_id} onValueChange={(value) => setNewUser({...newUser, shop_id: value})}>
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                              <SelectValue placeholder="Sélectionner un magasin" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {shops.map(shop => (
                                <SelectItem key={shop.id} value={shop.id} className="text-white focus:bg-slate-700">
                                  {shop.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="user-role" className="text-white">Rôle</Label>
                          <Select value={newUser.role} onValueChange={(value: any) => setNewUser({...newUser, role: value})}>
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="admin" className="text-white focus:bg-slate-700">Administrateur</SelectItem>
                              <SelectItem value="technician" className="text-white focus:bg-slate-700">Technicien</SelectItem>
                              <SelectItem value="super_admin" className="text-white focus:bg-slate-700">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                          Annuler
                        </Button>
                        <Button onClick={createUser} className="bg-emerald-600 hover:bg-emerald-700">
                          Créer l'utilisateur
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profiles.map((profile) => (
                    <Card key={profile.id} className="bg-white border-slate-200 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="font-semibold text-lg text-slate-900">
                                {profile.first_name} {profile.last_name}
                              </h3>
                               <Badge variant={profile.role === 'super_admin' ? 'default' : profile.role === 'admin' ? 'secondary' : 'outline'} 
                                 className={profile.role === 'super_admin' ? 'bg-primary text-primary-foreground' : ''}>
                                {profile.role === 'super_admin' && <Crown className="h-3 w-3 mr-1" />}
                                {profile.role === 'super_admin' ? 'Super Admin' : 
                                 profile.role === 'admin' ? 'Administrateur' : 'Technicien'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                              <div>
                                <span className="font-medium">Magasin: </span>
                                <span>{profile.shop?.name || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium">Email: </span>
                                <span>{profile.shop?.email || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium">Téléphone: </span>
                                <span>{profile.phone}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-100">
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                            {profile.role !== 'super_admin' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => deleteUser(profile.id, profile.user_id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Supprimer
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans d'abonnement */}
          <TabsContent value="plans">
            <SubscriptionPlansManager />
          </TabsContent>

          {/* Statistics */}
          <TabsContent value="statistics">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <TrendingUp className="h-5 w-5" />
                  Statistiques par Magasin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shops.map((shop) => (
                    <Card key={shop.id} className="bg-white border-slate-200">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <h4 className="font-medium text-slate-900">{shop.name}</h4>
                            <p className="text-sm text-slate-600">{shop.email}</p>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{shop.total_sav_cases}</div>
                            <div className="text-sm text-slate-600">Dossiers SAV</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{shop.total_revenue?.toFixed(2)}€</div>
                            <div className="text-sm text-slate-600">Chiffre d'affaires</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{shop.average_case_value?.toFixed(2)}€</div>
                            <div className="text-sm text-slate-600">Panier moyen</div>
                          </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center">
                            <div className="font-medium text-yellow-600">{shop.pending_cases}</div>
                            <div className="text-slate-600">En attente</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-blue-600">{shop.in_progress_cases}</div>
                            <div className="text-slate-600">En cours</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-green-600">{shop.ready_cases}</div>
                            <div className="text-slate-600">Prêt</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-slate-600">{shop.delivered_cases}</div>
                            <div className="text-slate-600">Livré</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de gestion du magasin */}
        <ShopManagementDialog
          shop={selectedShop}
          isOpen={isShopManagementOpen}
          onClose={() => setIsShopManagementOpen(false)}
          onUpdate={fetchData}
        />
      </main>
    </div>
  );
}