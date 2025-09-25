import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import { useMenuPermissions } from '@/hooks/useMenuPermissions';
import { supabase } from '@/integrations/supabase/client';
import {
  SettingsIcon,
  Menu,
  Store,
  FileText,
  Package,
  ShoppingCart,
  Users,
  MessageSquare,
  BarChart3
} from 'lucide-react';

export const MenuConfigurationTab = () => {
  const { shop, loading, refetch } = useShop();
  const { permissions, canToggleMenu, loading: permissionsLoading } = useMenuPermissions();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [menuConfig, setMenuConfig] = useState({
    menu_dashboard_visible: true,
    menu_sav_visible: true,
    menu_parts_visible: true,
    menu_quotes_visible: true,
    menu_orders_visible: true,
    menu_customers_visible: true,
    menu_chats_visible: true,
    menu_statistics_visible: true,
    sidebar_nav_visible: true,
    sidebar_sav_types_visible: true,
    sidebar_sav_statuses_visible: true,
    sidebar_late_sav_visible: true
  });

  // Charger la configuration depuis la boutique
  useEffect(() => {
    if (shop) {
      setMenuConfig({
        menu_dashboard_visible: (shop as any).menu_dashboard_visible ?? true,
        menu_sav_visible: (shop as any).menu_sav_visible ?? true,
        menu_parts_visible: (shop as any).menu_parts_visible ?? true,
        menu_quotes_visible: (shop as any).menu_quotes_visible ?? true,
        menu_orders_visible: (shop as any).menu_orders_visible ?? true,
        menu_customers_visible: (shop as any).menu_customers_visible ?? true,
        menu_chats_visible: (shop as any).menu_chats_visible ?? true,
        menu_statistics_visible: (shop as any).menu_statistics_visible ?? true,
        sidebar_nav_visible: (shop as any).sidebar_nav_visible ?? true,
        sidebar_sav_types_visible: (shop as any).sidebar_sav_types_visible ?? true,
        sidebar_sav_statuses_visible: (shop as any).sidebar_sav_statuses_visible ?? true,
        sidebar_late_sav_visible: (shop as any).sidebar_late_sav_visible ?? true
      });
    }
  }, [shop]);

  const handleToggleMenu = (menuKey: keyof typeof menuConfig, enabled: boolean) => {
    setMenuConfig(prev => ({
      ...prev,
      [menuKey]: enabled
    }));
  };

  const handleSave = async () => {
    if (!shop) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update(menuConfig)
        .eq('id', shop.id);

      if (error) throw error;
      
      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres d'affichage des menus ont été mis à jour",
      });
      
      refetch();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    {
      key: 'menu_dashboard_visible' as const,
      title: 'Tableau de bord',
      description: 'Page d\'accueil avec les indicateurs principaux',
      icon: Store,
      permissionKey: 'dashboard' as const
    },
    {
      key: 'menu_sav_visible' as const,
      title: 'Dossiers SAV',
      description: 'Gestion des dossiers de service après-vente',
      icon: FileText,
      permissionKey: 'sav' as const
    },
    {
      key: 'menu_parts_visible' as const,
      title: 'Stock pièces',
      description: 'Gestion du stock et des pièces détachées',
      icon: Package,
      permissionKey: 'parts' as const
    },
    {
      key: 'menu_quotes_visible' as const,
      title: 'Devis',
      description: 'Création et gestion des devis clients',
      icon: FileText,
      permissionKey: 'quotes' as const
    },
    {
      key: 'menu_orders_visible' as const,
      title: 'Commandes',
      description: 'Gestion des commandes de pièces',
      icon: ShoppingCart,
      permissionKey: 'orders' as const
    },
    {
      key: 'menu_customers_visible' as const,
      title: 'Clients',
      description: 'Base de données des clients',
      icon: Users,
      permissionKey: 'customers' as const
    },
    {
      key: 'menu_chats_visible' as const,
      title: 'Chat clients',
      description: 'Communication en temps réel avec les clients',
      icon: MessageSquare,
      permissionKey: 'chats' as const
    },
    {
      key: 'menu_statistics_visible' as const,
      title: 'Statistiques',
      description: 'Rapports et analyses détaillées',
      icon: BarChart3,
      permissionKey: 'statistics' as const
    }
  ];

  const sidebarItems = [
    {
      key: 'sidebar_late_sav_visible' as const,
      title: 'SAV en retard',
      description: 'Afficher la zone d\'alerte pour les SAV dépassant les délais',
      permissionKey: 'sidebar_late_sav' as const
    },
    {
      key: 'sidebar_sav_types_visible' as const,
      title: 'Types de SAV',
      description: 'Afficher la section avec les compteurs par type de SAV',
      permissionKey: 'sidebar_sav_types' as const
    },
    {
      key: 'sidebar_sav_statuses_visible' as const,
      title: 'Statuts SAV',
      description: 'Afficher la section avec les compteurs par statut SAV',
      permissionKey: 'sidebar_sav_statuses' as const
    }
  ];

  if (loading || permissionsLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Menu className="h-5 w-5" />
            Configuration des menus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium mb-3">Menus principaux</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Contrôlez l'affichage de chaque menu selon votre plan d'abonnement
              </p>
              <div className="space-y-3">
                {menuItems.map((item) => {
                  const canToggle = canToggleMenu(item.permissionKey);
                  const Icon = item.icon;
                  
                  return (
                    <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Icon className="h-4 w-4" />
                          {item.title}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                        {!canToggle && (
                          <p className="text-xs text-orange-600 mt-1">
                            Non disponible avec votre plan actuel
                          </p>
                        )}
                      </div>
                      <Switch 
                        checked={menuConfig[item.key]}
                        onCheckedChange={(checked) => handleToggleMenu(item.key, checked)}
                        disabled={!canToggle} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-3">Zones sidebar</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Contrôlez l'affichage des sections spécialisées de la sidebar
              </p>
              <div className="space-y-3">
                {sidebarItems.map((item) => {
                  const canToggle = canToggleMenu(item.permissionKey);
                  
                  return (
                    <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                        {!canToggle && (
                          <p className="text-xs text-orange-600 mt-1">
                            Non disponible avec votre plan actuel
                          </p>
                        )}
                      </div>
                      <Switch 
                        checked={menuConfig[item.key]}
                        onCheckedChange={(checked) => handleToggleMenu(item.key, checked)}
                        disabled={!canToggle} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Les modifications s'appliquent après sauvegarde
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Les menus grisés nécessitent une mise à niveau de plan
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                Une interface personnalisée améliore l'expérience utilisateur
              </p>
            </div>
          </div>
          
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};