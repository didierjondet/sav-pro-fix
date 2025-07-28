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
      // Fetch shops with statistics
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select(`
          *,
          profiles:profiles(count),
          sav_cases:sav_cases(
            id,
            status,
            total_cost
          )
        `);

      if (shopsError) throw shopsError;

      // Process shop statistics
      const shopsWithStats = shopsData?.map(shop => ({
        ...shop,
        total_users: shop.profiles?.[0]?.count || 0,
        total_sav_cases: shop.sav_cases?.length || 0,
        pending_cases: shop.sav_cases?.filter((c: any) => c.status === 'pending').length || 0,
        in_progress_cases: shop.sav_cases?.filter((c: any) => c.status === 'in_progress').length || 0,
        ready_cases: shop.sav_cases?.filter((c: any) => c.status === 'ready').length || 0,
        delivered_cases: shop.sav_cases?.filter((c: any) => c.status === 'delivered').length || 0,
        total_revenue: shop.sav_cases?.reduce((sum: number, c: any) => sum + (c.total_cost || 0), 0) || 0,
        average_case_value: shop.sav_cases?.length > 0 
          ? shop.sav_cases.reduce((sum: number, c: any) => sum + (c.total_cost || 0), 0) / shop.sav_cases.length 
          : 0
      })) || [];

      setShops(shopsWithStats);

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          shop:shops(name, email)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
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
      // Supprimer en cascade toutes les données du magasin
      const { error: partsError } = await supabase
        .from('parts')
        .delete()
        .eq('shop_id', shopId);

      if (partsError) throw partsError;

      const { error: customersError } = await supabase
        .from('customers')
        .delete()
        .eq('shop_id', shopId);

      if (customersError) throw customersError;

      const { error: quotesError } = await supabase
        .from('quotes')
        .delete()
        .eq('shop_id', shopId);

      if (quotesError) throw quotesError;

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('shop_id', shopId);

      if (orderItemsError) throw orderItemsError;

      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('shop_id', shopId);

      if (notificationsError) throw notificationsError;

      const { error: messagesError } = await supabase
        .from('sav_messages')
        .delete()
        .eq('shop_id', shopId);

      if (messagesError) throw messagesError;

      const { error: savCasesError } = await supabase
        .from('sav_cases')
        .delete()
        .eq('shop_id', shopId);

      if (savCasesError) throw savCasesError;

      const { error: profilesError } = await supabase
        .from('profiles')
        .delete()
        .eq('shop_id', shopId);

      if (profilesError) throw profilesError;

      const { error: shopError } = await supabase
        .from('shops')
        .delete()
        .eq('id', shopId);

      if (shopError) throw shopError;

      setShops(shops.filter(shop => shop.id !== shopId));
      
      toast({
        title: "Succès",
        description: "Magasin et toutes ses données supprimés",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement du panneau Super Admin...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header spécial Super Admin */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Globe className="h-6 w-6" />
                  Super Administration
                </h1>
                <p className="text-purple-200">Panneau de contrôle réseau SAV Pro</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white font-medium">{user?.email}</p>
                <p className="text-xs text-purple-300 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Super Administrateur
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-200"
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
            <Shield className="h-10 w-10 text-purple-400" />
            <div>
              <h2 className="text-4xl font-bold text-white">Administration du Réseau</h2>
              <p className="text-xl text-purple-200">Gestion centralisée de tous les magasins et utilisateurs</p>
            </div>
          </div>
        </div>

        {/* Dashboard Overview - Design distinctif */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 font-medium">Total Magasins</p>
                  <p className="text-3xl font-bold text-white">{totalStats.totalShops}</p>
                </div>
                <div className="p-3 bg-blue-500/30 rounded-lg">
                  <Store className="h-8 w-8 text-blue-200" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 font-medium">Total Utilisateurs</p>
                  <p className="text-3xl font-bold text-white">{totalStats.totalUsers}</p>
                </div>
                <div className="p-3 bg-green-500/30 rounded-lg">
                  <Users className="h-8 w-8 text-green-200" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 font-medium">Chiffre d'affaires</p>
                  <p className="text-3xl font-bold text-white">{totalStats.totalRevenue.toFixed(2)}€</p>
                </div>
                <div className="p-3 bg-yellow-500/30 rounded-lg">
                  <DollarSign className="h-8 w-8 text-yellow-200" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 font-medium">Total Dossiers SAV</p>
                  <p className="text-3xl font-bold text-white">{totalStats.totalCases}</p>
                </div>
                <div className="p-3 bg-purple-500/30 rounded-lg">
                  <Activity className="h-8 w-8 text-purple-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="shops" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-black/20 border-white/10">
            <TabsTrigger value="shops" className="flex items-center gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-white text-purple-200">
              <Store className="h-4 w-4" />
              Gestion Magasins
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-white text-purple-200">
              <Users className="h-4 w-4" />
              Gestion Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-white text-purple-200">
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </TabsTrigger>
          </TabsList>

          {/* Shops Management */}
          <TabsContent value="shops">
            <Card className="bg-black/20 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Store className="h-5 w-5" />
                    Gestion des Magasins
                  </CardTitle>
                  <Dialog open={isCreateShopOpen} onOpenChange={setIsCreateShopOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-purple-600 hover:bg-purple-700">
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
                        <Button onClick={createShop} className="bg-purple-600 hover:bg-purple-700">
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
                        <Button onClick={updateShop} className="bg-purple-600 hover:bg-purple-700">
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
                    <Card key={shop.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="font-semibold text-lg text-white">{shop.name}</h3>
                              <Badge variant="outline" className="border-purple-400 text-purple-300">
                                {shop.total_users} utilisateur(s)
                              </Badge>
                              <Badge variant="outline" className="border-blue-400 text-blue-300">
                                {shop.total_sav_cases} dossier(s) SAV
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-2">
                              <div className="text-slate-300">
                                <span className="font-medium">Email: </span>
                                <span>{shop.email}</span>
                              </div>
                              <div className="text-slate-300">
                                <span className="font-medium">Téléphone: </span>
                                <span>{shop.phone}</span>
                              </div>
                              <div className="text-slate-300">
                                <span className="font-medium">CA: </span>
                                <span>{shop.total_revenue?.toFixed(2)}€</span>
                              </div>
                            </div>
                            
                            {shop.slug && (
                              <div className="flex items-center gap-2 bg-black/20 p-3 rounded-lg">
                                <div className="flex-1">
                                  <span className="font-medium text-sm text-slate-300">URL du magasin: </span>
                                  <a 
                                    href={`${window.location.origin}/${shop.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-400 hover:text-purple-300 font-mono text-sm"
                                  >
                                    {window.location.origin}/{shop.slug}
                                  </a>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="border-white/20 text-white hover:bg-white/10"
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
                              className="border-white/20 text-white hover:bg-white/10"
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
                                  className="border-red-400/50 text-red-400 hover:bg-red-500/20"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Supprimer
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-900 border-red-500/20">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-400" />
                                    Supprimer le magasin "{shop.name}"
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-300">
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
                                      <p className="font-medium text-red-400 mt-3">
                                        Voulez-vous vraiment continuer ?
                                      </p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
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
            <Card className="bg-black/20 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Users className="h-5 w-5" />
                    Gestion des Utilisateurs
                  </CardTitle>
                  <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-purple-600 hover:bg-purple-700">
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
                        <Button onClick={createUser} className="bg-purple-600 hover:bg-purple-700">
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
                    <Card key={profile.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="font-semibold text-lg text-white">
                                {profile.first_name} {profile.last_name}
                              </h3>
                              <Badge variant={profile.role === 'super_admin' ? 'default' : profile.role === 'admin' ? 'secondary' : 'outline'} 
                                className={profile.role === 'super_admin' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : ''}>
                                {profile.role === 'super_admin' && <Crown className="h-3 w-3 mr-1" />}
                                {profile.role === 'super_admin' ? 'Super Admin' : 
                                 profile.role === 'admin' ? 'Administrateur' : 'Technicien'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
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
                            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                            {profile.role !== 'super_admin' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-red-400/50 text-red-400 hover:bg-red-500/20"
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

          {/* Statistics */}
          <TabsContent value="statistics">
            <Card className="bg-black/20 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="h-5 w-5" />
                  Statistiques par Magasin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shops.map((shop) => (
                    <Card key={shop.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <h4 className="font-medium text-white">{shop.name}</h4>
                            <p className="text-sm text-slate-400">{shop.email}</p>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">{shop.total_sav_cases}</div>
                            <div className="text-sm text-slate-400">Dossiers SAV</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">{shop.total_revenue?.toFixed(2)}€</div>
                            <div className="text-sm text-slate-400">Chiffre d'affaires</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400">{shop.average_case_value?.toFixed(2)}€</div>
                            <div className="text-sm text-slate-400">Panier moyen</div>
                          </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center">
                            <div className="font-medium text-yellow-400">{shop.pending_cases}</div>
                            <div className="text-slate-400">En attente</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-blue-400">{shop.in_progress_cases}</div>
                            <div className="text-slate-400">En cours</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-green-400">{shop.ready_cases}</div>
                            <div className="text-slate-400">Prêt</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-slate-400">{shop.delivered_cases}</div>
                            <div className="text-slate-400">Livré</div>
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
      </main>
    </div>
  );
}