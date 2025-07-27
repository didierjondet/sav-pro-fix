import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
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
  DollarSign
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Shop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  sms_credits: number;
  created_at: string;
  total_users?: number;
  total_sav_cases?: number;
  pending_cases?: number;
  in_progress_cases?: number;
  ready_cases?: number;
  delivered_cases?: number;
  total_revenue?: number;
  average_case_value?: number;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreateShopOpen, setIsCreateShopOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  
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

  const deleteShop = async (shopId: string) => {
    try {
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', shopId);

      if (error) throw error;

      setShops(shops.filter(shop => shop.id !== shopId));
      
      toast({
        title: "Succès",
        description: "Magasin supprimé",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 px-6 pb-6">
          <div className="text-center py-8">Chargement...</div>
        </main>
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
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="md:ml-64 px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Administration Super Utilisateur</h1>
          </div>

          {/* Dashboard Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Magasins</p>
                    <p className="text-2xl font-bold">{totalStats.totalShops}</p>
                  </div>
                  <Store className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Utilisateurs</p>
                    <p className="text-2xl font-bold">{totalStats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                    <p className="text-2xl font-bold">{totalStats.totalRevenue.toFixed(2)}€</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Dossiers SAV</p>
                    <p className="text-2xl font-bold">{totalStats.totalCases}</p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="shops" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="shops" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Gestion Magasins
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Gestion Utilisateurs
              </TabsTrigger>
              <TabsTrigger value="statistics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Statistiques
              </TabsTrigger>
            </TabsList>

            {/* Shops Management */}
            <TabsContent value="shops">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      Gestion des Magasins
                    </CardTitle>
                    <Dialog open={isCreateShopOpen} onOpenChange={setIsCreateShopOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer un magasin
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Créer un nouveau magasin</DialogTitle>
                          <DialogDescription>
                            Créez un nouveau magasin pour un client.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="shop-name">Nom du magasin</Label>
                            <Input
                              id="shop-name"
                              value={newShop.name}
                              onChange={(e) => setNewShop({...newShop, name: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="shop-email">Email</Label>
                            <Input
                              id="shop-email"
                              type="email"
                              value={newShop.email}
                              onChange={(e) => setNewShop({...newShop, email: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="shop-phone">Téléphone</Label>
                            <Input
                              id="shop-phone"
                              value={newShop.phone}
                              onChange={(e) => setNewShop({...newShop, phone: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="shop-address">Adresse</Label>
                            <Textarea
                              id="shop-address"
                              value={newShop.address}
                              onChange={(e) => setNewShop({...newShop, address: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="sms-credits">Crédits SMS</Label>
                            <Input
                              id="sms-credits"
                              type="number"
                              value={newShop.sms_credits}
                              onChange={(e) => setNewShop({...newShop, sms_credits: parseInt(e.target.value)})}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateShopOpen(false)}>
                            Annuler
                          </Button>
                          <Button onClick={createShop}>
                            Créer le magasin
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {shops.map((shop) => (
                      <Card key={shop.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <h3 className="font-semibold text-lg">{shop.name}</h3>
                                <Badge variant="outline">
                                  {shop.total_users} utilisateur(s)
                                </Badge>
                                <Badge variant="outline">
                                  {shop.total_sav_cases} dossier(s) SAV
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">Email: </span>
                                  <span>{shop.email}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Téléphone: </span>
                                  <span>{shop.phone}</span>
                                </div>
                                <div>
                                  <span className="font-medium">Crédits SMS: </span>
                                  <span>{shop.sms_credits}</span>
                                </div>
                                <div>
                                  <span className="font-medium">CA: </span>
                                  <span>{shop.total_revenue?.toFixed(2)}€</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                Modifier
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteShop(shop.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Supprimer
                              </Button>
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
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Gestion des Utilisateurs
                    </CardTitle>
                    <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer un utilisateur
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                          <DialogDescription>
                            Créez un nouvel utilisateur et assignez-le à un magasin.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="user-email">Email</Label>
                            <Input
                              id="user-email"
                              type="email"
                              value={newUser.email}
                              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="user-password">Mot de passe</Label>
                            <Input
                              id="user-password"
                              type="password"
                              value={newUser.password}
                              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="user-firstname">Prénom</Label>
                              <Input
                                id="user-firstname"
                                value={newUser.first_name}
                                onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="user-lastname">Nom</Label>
                              <Input
                                id="user-lastname"
                                value={newUser.last_name}
                                onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="user-phone">Téléphone</Label>
                            <Input
                              id="user-phone"
                              value={newUser.phone}
                              onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="user-shop">Magasin</Label>
                            <Select value={newUser.shop_id} onValueChange={(value) => setNewUser({...newUser, shop_id: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un magasin" />
                              </SelectTrigger>
                              <SelectContent>
                                {shops.map(shop => (
                                  <SelectItem key={shop.id} value={shop.id}>
                                    {shop.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="user-role">Rôle</Label>
                            <Select value={newUser.role} onValueChange={(value: any) => setNewUser({...newUser, role: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrateur</SelectItem>
                                <SelectItem value="technician">Technicien</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                            Annuler
                          </Button>
                          <Button onClick={createUser}>
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
                      <Card key={profile.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-2">
                                <h3 className="font-semibold text-lg">
                                  {profile.first_name} {profile.last_name}
                                </h3>
                                <Badge variant={profile.role === 'super_admin' ? 'default' : profile.role === 'admin' ? 'secondary' : 'outline'}>
                                  {profile.role === 'super_admin' && <Crown className="h-3 w-3 mr-1" />}
                                  {profile.role === 'super_admin' ? 'Super Admin' : 
                                   profile.role === 'admin' ? 'Administrateur' : 'Technicien'}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
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
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                Modifier
                              </Button>
                              {profile.role !== 'super_admin' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive"
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
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Statistiques par Magasin
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {shops.map((shop) => (
                        <Card key={shop.id} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <h4 className="font-medium">{shop.name}</h4>
                              <p className="text-sm text-muted-foreground">{shop.email}</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{shop.total_sav_cases}</div>
                              <div className="text-sm text-muted-foreground">Dossiers SAV</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{shop.total_revenue?.toFixed(2)}€</div>
                              <div className="text-sm text-muted-foreground">Chiffre d'affaires</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">{shop.average_case_value?.toFixed(2)}€</div>
                              <div className="text-sm text-muted-foreground">Panier moyen</div>
                            </div>
                          </div>
                          
                          <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
                            <div className="text-center">
                              <div className="font-medium text-yellow-600">{shop.pending_cases}</div>
                              <div className="text-muted-foreground">En attente</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-blue-600">{shop.in_progress_cases}</div>
                              <div className="text-muted-foreground">En cours</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-green-600">{shop.ready_cases}</div>
                              <div className="text-muted-foreground">Prêt</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-gray-600">{shop.delivered_cases}</div>
                              <div className="text-muted-foreground">Livré</div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}