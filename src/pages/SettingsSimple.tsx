import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import { useMenuPermissions } from '@/hooks/useMenuPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Palette,
  Shield,
  Menu,
  Sidebar,
  Lock,
  Unlock
} from 'lucide-react';
import { StatisticsConfiguration } from '@/components/settings/StatisticsConfiguration';

export default function SettingsSimple() {
  const { shop, loading, refetch } = useShop();
  const { permissions, canToggleMenu, loading: permissionsLoading } = useMenuPermissions();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [shopForm, setShopForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '',
    website_enabled: false,
    website_title: '',
    website_description: '',
    subscription_menu_visible: true,
    max_sav_processing_days_client: 7,
    max_sav_processing_days_internal: 7,
    max_sav_processing_days_external: 9,
    auto_review_enabled: true,
    review_link: '',
    custom_review_sms_message: '',
    custom_review_chat_message: '',
    sidebar_nav_visible: true,
    sidebar_sav_types_visible: true,
    sidebar_sav_statuses_visible: true,
    sidebar_late_sav_visible: true,
    menu_dashboard_visible: true,
    menu_sav_visible: true,
    menu_parts_visible: true,
    menu_quotes_visible: true,
    menu_orders_visible: true,
    menu_customers_visible: true,
    menu_chats_visible: true,
    menu_statistics_visible: true
  });

  useEffect(() => {
    if (shop) {
      setShopForm({
        name: shop.name || '',
        address: shop.address || '',
        phone: shop.phone || '',
        email: shop.email || '',
        logo_url: shop.logo_url || '',
        website_enabled: (shop as any).website_enabled ?? false,
        website_title: (shop as any).website_title || '',
        website_description: (shop as any).website_description || '',
        subscription_menu_visible: (shop as any).subscription_menu_visible ?? true,
        max_sav_processing_days_client: shop.max_sav_processing_days_client || 7,
        max_sav_processing_days_internal: shop.max_sav_processing_days_internal || 7,
        max_sav_processing_days_external: (shop as any).max_sav_processing_days_external || 9,
        auto_review_enabled: (shop as any).auto_review_enabled ?? true,
        review_link: (shop as any).review_link || '',
        custom_review_sms_message: (shop as any).custom_review_sms_message || '',
        custom_review_chat_message: (shop as any).custom_review_chat_message || '',
        sidebar_nav_visible: (shop as any).sidebar_nav_visible ?? true,
        sidebar_sav_types_visible: (shop as any).sidebar_sav_types_visible ?? true,
        sidebar_sav_statuses_visible: (shop as any).sidebar_sav_statuses_visible ?? true,
        sidebar_late_sav_visible: (shop as any).sidebar_late_sav_visible ?? true,
        menu_dashboard_visible: (shop as any).menu_dashboard_visible ?? true,
        menu_sav_visible: (shop as any).menu_sav_visible ?? true,
        menu_parts_visible: (shop as any).menu_parts_visible ?? true,
        menu_quotes_visible: (shop as any).menu_quotes_visible ?? true,
        menu_orders_visible: (shop as any).menu_orders_visible ?? true,
        menu_customers_visible: (shop as any).menu_customers_visible ?? true,
        menu_chats_visible: (shop as any).menu_chats_visible ?? true,
        menu_statistics_visible: (shop as any).menu_statistics_visible ?? true
      });
    }
  }, [shop]);

  const handleToggleMenu = async (menuKey: string, enabled: boolean) => {
    if (!shop) return;
    
    setSaving(true);
    try {
      const updateData = { [menuKey]: enabled };
      
      const { error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', shop.id);

      if (error) throw error;

      setShopForm(prev => ({ ...prev, [menuKey]: enabled }));
      
      toast({
        title: "Succès",
        description: "Préférences d'affichage mises à jour",
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || permissionsLoading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre magasin et l'affichage des menus
        </p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Apparence
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Menu className="h-5 w-5" />
                Contrôle d'affichage des menus
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Personnalisez l'affichage des différents menus selon votre plan d'abonnement
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Menus principaux</Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="dashboard">Tableau de bord</Label>
                        {!canToggleMenu('dashboard') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="dashboard"
                        checked={shopForm.menu_dashboard_visible && permissions.dashboard}
                        onCheckedChange={(checked) => handleToggleMenu('menu_dashboard_visible', checked)}
                        disabled={saving || !canToggleMenu('dashboard')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="sav">Dossiers SAV</Label>
                        {!canToggleMenu('sav') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="sav"
                        checked={shopForm.menu_sav_visible && permissions.sav}
                        onCheckedChange={(checked) => handleToggleMenu('menu_sav_visible', checked)}
                        disabled={saving || !canToggleMenu('sav')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="parts">Stock pièces</Label>
                        {!canToggleMenu('parts') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="parts"
                        checked={shopForm.menu_parts_visible && permissions.parts}
                        onCheckedChange={(checked) => handleToggleMenu('menu_parts_visible', checked)}
                        disabled={saving || !canToggleMenu('parts')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="quotes">Devis</Label>
                        {!canToggleMenu('quotes') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="quotes"
                        checked={shopForm.menu_quotes_visible && permissions.quotes}
                        onCheckedChange={(checked) => handleToggleMenu('menu_quotes_visible', checked)}
                        disabled={saving || !canToggleMenu('quotes')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="orders">Commandes</Label>
                        {!canToggleMenu('orders') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="orders"
                        checked={shopForm.menu_orders_visible && permissions.orders}
                        onCheckedChange={(checked) => handleToggleMenu('menu_orders_visible', checked)}
                        disabled={saving || !canToggleMenu('orders')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="customers">Clients</Label>
                        {!canToggleMenu('customers') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="customers"
                        checked={shopForm.menu_customers_visible && permissions.customers}
                        onCheckedChange={(checked) => handleToggleMenu('menu_customers_visible', checked)}
                        disabled={saving || !canToggleMenu('customers')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="chats">Chat clients</Label>
                        {!canToggleMenu('chats') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="chats"
                        checked={shopForm.menu_chats_visible && permissions.chats}
                        onCheckedChange={(checked) => handleToggleMenu('menu_chats_visible', checked)}
                        disabled={saving || !canToggleMenu('chats')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="statistics">Statistiques</Label>
                        {!canToggleMenu('statistics') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="statistics"
                        checked={shopForm.menu_statistics_visible && permissions.statistics}
                        onCheckedChange={(checked) => handleToggleMenu('menu_statistics_visible', checked)}
                        disabled={saving || !canToggleMenu('statistics')}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Sidebar className="h-4 w-4" />
                    Zones sidebar
                  </Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="late-sav">SAV en retard</Label>
                        {!canToggleMenu('sidebar_late_sav') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="late-sav"
                        checked={shopForm.sidebar_late_sav_visible && permissions.sidebar_late_sav}
                        onCheckedChange={(checked) => handleToggleMenu('sidebar_late_sav_visible', checked)}
                        disabled={saving || !canToggleMenu('sidebar_late_sav')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="sav-types">Types de SAV</Label>
                        {!canToggleMenu('sidebar_sav_types') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="sav-types"
                        checked={shopForm.sidebar_sav_types_visible && permissions.sidebar_sav_types}
                        onCheckedChange={(checked) => handleToggleMenu('sidebar_sav_types_visible', checked)}
                        disabled={saving || !canToggleMenu('sidebar_sav_types')}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="sav-statuses">Statuts SAV</Label>
                        {!canToggleMenu('sidebar_sav_statuses') && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <Switch
                        id="sav-statuses"
                        checked={shopForm.sidebar_sav_statuses_visible && permissions.sidebar_sav_statuses}
                        onCheckedChange={(checked) => handleToggleMenu('sidebar_sav_statuses_visible', checked)}
                        disabled={saving || !canToggleMenu('sidebar_sav_statuses')}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Contrôle basé sur votre plan</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Les menus disponibles dépendent de votre plan d'abonnement. 
                      Les fonctionnalités avec un <Lock className="inline h-3 w-3 mx-1" /> sont 
                      désactivées par votre plan. Les fonctionnalités avec un <Unlock className="inline h-3 w-3 mx-1" /> 
                      ont été forcées par un administrateur.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <StatisticsConfiguration />
        </TabsContent>
      </Tabs>
    </div>
  );
}