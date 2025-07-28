import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { 
  Store, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Settings, 
  AlertCircle,
  Crown,
  Infinity,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShopStats {
  id: string;
  name: string;
  email: string;
  subscription_tier: string;
  sms_credits_allocated: number;
  sms_credits_used: number;
  active_sav_count: number;
  total_users: number;
  total_cases: number;
  total_revenue: number;
}

interface GlobalSMSCredits {
  id: string;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
}

export default function NetworkManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<ShopStats[]>([]);
  const [globalSMS, setGlobalSMS] = useState<GlobalSMSCredits | null>(null);
  const [newCredits, setNewCredits] = useState<number>(0);

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    try {
      setLoading(true);

      // Fetch shops with stats
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select(`
          id,
          name,
          email,
          subscription_tier,
          sms_credits_allocated,
          sms_credits_used,
          active_sav_count
        `);

      if (shopsError) throw shopsError;

      // Fetch additional stats for each shop
      const shopsWithStats = await Promise.all(
        (shopsData || []).map(async (shop) => {
          // Count users
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', shop.id);

          // Count total cases
          const { count: casesCount } = await supabase
            .from('sav_cases')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', shop.id);

          return {
            ...shop,
            total_users: userCount || 0,
            total_cases: casesCount || 0,
            total_revenue: 0, // À implémenter avec un système de facturation
          };
        })
      );

      setShops(shopsWithStats);

      // Fetch global SMS credits
      const { data: smsData, error: smsError } = await supabase
        .from('global_sms_credits')
        .select('*')
        .single();

      if (smsError) throw smsError;
      setGlobalSMS(smsData);

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du réseau",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGlobalCredits = async () => {
    if (!globalSMS || newCredits <= 0) return;

    try {
      const { error } = await supabase
        .from('global_sms_credits')
        .update({ 
          total_credits: globalSMS.total_credits + newCredits 
        })
        .eq('id', globalSMS.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${newCredits} crédits SMS ajoutés au pool global`,
      });

      setNewCredits(0);
      fetchNetworkData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateShopSubscription = async (shopId: string, tier: string) => {
    try {
      let smsCredits = 15;
      if (tier === 'premium') smsCredits = 100;
      if (tier === 'enterprise') smsCredits = 400;

      const { error } = await supabase
        .from('shops')
        .update({ 
          subscription_tier: tier,
          sms_credits_allocated: smsCredits
        })
        .eq('id', shopId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Abonnement mis à jour",
      });

      fetchNetworkData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSubscriptionIcon = (tier: string) => {
    switch (tier) {
      case 'premium': return Crown;
      case 'enterprise': return Infinity;
      default: return CheckCircle;
    }
  };

  const getSubscriptionBadge = (tier: string) => {
    switch (tier) {
      case 'premium': return <Badge variant="secondary">Premium</Badge>;
      case 'enterprise': return <Badge>Enterprise</Badge>;
      default: return <Badge variant="outline">Gratuit</Badge>;
    }
  };

  const totalNetworkStats = {
    totalShops: shops.length,
    totalUsers: shops.reduce((sum, shop) => sum + shop.total_users, 0),
    totalCases: shops.reduce((sum, shop) => sum + shop.total_cases, 0),
    totalSMSUsed: shops.reduce((sum, shop) => sum + shop.sms_credits_used, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} isMobileMenuOpen={sidebarOpen} />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} isMobileMenuOpen={sidebarOpen} />
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Gestion du Réseau MySAV</h1>
            <p className="text-muted-foreground">Supervision et administration du réseau de magasins</p>
          </div>

          {/* Global Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Magasins Actifs</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalNetworkStats.totalShops}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs Totaux</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalNetworkStats.totalUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SAV Traités</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalNetworkStats.totalCases}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SMS Envoyés</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalNetworkStats.totalSMSUsed}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="shops" className="space-y-6">
            <TabsList>
              <TabsTrigger value="shops">Magasins</TabsTrigger>
              <TabsTrigger value="sms">Gestion SMS</TabsTrigger>
            </TabsList>

            <TabsContent value="shops" className="space-y-6">
              <div className="grid gap-6">
                {shops.map((shop) => {
                  const SubscriptionIcon = getSubscriptionIcon(shop.subscription_tier);
                  const smsUsagePercent = (shop.sms_credits_used / shop.sms_credits_allocated) * 100;
                  
                  return (
                    <Card key={shop.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <SubscriptionIcon className="h-5 w-5" />
                              {shop.name}
                            </CardTitle>
                            <CardDescription>{shop.email}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSubscriptionBadge(shop.subscription_tier)}
                            {smsUsagePercent > 90 && (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                SMS Limité
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Utilisateurs</p>
                            <p className="text-2xl font-bold">{shop.total_users}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">SAV Actifs</p>
                            <p className="text-2xl font-bold">{shop.active_sav_count}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total SAV</p>
                            <p className="text-2xl font-bold">{shop.total_cases}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">SMS Utilisés</p>
                            <p className="text-2xl font-bold">
                              {shop.sms_credits_used}/{shop.sms_credits_allocated}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateShopSubscription(shop.id, 'free')}
                            disabled={shop.subscription_tier === 'free'}
                          >
                            Gratuit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateShopSubscription(shop.id, 'premium')}
                            disabled={shop.subscription_tier === 'premium'}
                          >
                            Premium
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateShopSubscription(shop.id, 'enterprise')}
                            disabled={shop.subscription_tier === 'enterprise'}
                          >
                            Enterprise
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-6">
              {globalSMS && (
                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Pool Global SMS
                      </CardTitle>
                      <CardDescription>
                        Gestion centralisée des crédits SMS pour tous les magasins
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-muted-foreground">Crédits Totaux</p>
                          <p className="text-2xl font-bold">{globalSMS.total_credits.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Crédits Utilisés</p>
                          <p className="text-2xl font-bold">{globalSMS.used_credits.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Crédits Restants</p>
                          <p className="text-2xl font-bold">{globalSMS.remaining_credits.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <Label htmlFor="newCredits">Ajouter des crédits</Label>
                          <Input
                            id="newCredits"
                            type="number"
                            value={newCredits}
                            onChange={(e) => setNewCredits(Number(e.target.value))}
                            placeholder="Nombre de crédits à ajouter"
                          />
                        </div>
                        <Button onClick={updateGlobalCredits} disabled={newCredits <= 0}>
                          Ajouter Crédits
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Distribution SMS par Magasin</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {shops.map((shop) => (
                          <div key={shop.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{shop.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {getSubscriptionBadge(shop.subscription_tier)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">
                                {shop.sms_credits_used}/{shop.sms_credits_allocated}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {Math.round((shop.sms_credits_used / shop.sms_credits_allocated) * 100)}% utilisé
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}