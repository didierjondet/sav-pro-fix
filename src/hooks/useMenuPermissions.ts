import { useMemo, useRef, useEffect } from 'react';
import { useShop } from './useShop';
import { useSubscriptionFeatures } from './useSubscriptionFeatures';

interface MenuPermissions {
  dashboard: boolean;
  sav: boolean;
  parts: boolean;
  quotes: boolean;
  orders: boolean;
  customers: boolean;
  chats: boolean;
  sidebar_sav_types: boolean;
  sidebar_sav_statuses: boolean;
  sidebar_late_sav: boolean;
  statistics: boolean;
}

export function useMenuPermissions(): {
  permissions: MenuPermissions;
  loading: boolean;
  canToggleMenu: (menuKey: keyof MenuPermissions) => boolean;
} {
  const { shop, loading: shopLoading } = useShop();
  const { menuConfig, loading: featuresLoading } = useSubscriptionFeatures();
  
  // Garder les dernières permissions valides en mémoire
  const lastValidPermissions = useRef<MenuPermissions | null>(null);

  const permissions = useMemo(() => {
    // Si on est en chargement ET qu'on a des permissions valides, les retourner
    if ((shopLoading || featuresLoading) && lastValidPermissions.current) {
      return lastValidPermissions.current;
    }

    // Si pas de données, retourner les permissions par défaut
    if (!shop || !menuConfig) {
      const defaultPerms: MenuPermissions = {
        dashboard: true,
        sav: true,
        parts: true,
        quotes: false,
        orders: false,
        customers: true,
        chats: false,
        sidebar_sav_types: true,
        sidebar_sav_statuses: true,
        sidebar_late_sav: true,
        statistics: false
      };
      return defaultPerms;
    }

    // Récupérer les features forcées par le super admin
    const forcedFeatures = shop.forced_features || {};
    
    // Commencer par les permissions du plan
    const basePermissions = { ...menuConfig };
    
    // Appliquer les overrides du super admin (ils activent des menus même si le plan ne les prévoit pas)
    Object.keys(forcedFeatures).forEach(key => {
      if (key in basePermissions && forcedFeatures[key] === true) {
        (basePermissions as any)[key] = true;
      }
    });

    // Récupérer les préférences utilisateur du magasin
    const shopPreferences = {
      dashboard: shop.menu_dashboard_visible ?? true,
      sav: shop.menu_sav_visible ?? true,
      parts: shop.menu_parts_visible ?? true,
      quotes: shop.menu_quotes_visible ?? true,
      orders: shop.menu_orders_visible ?? true,
      customers: shop.menu_customers_visible ?? true,
      chats: shop.menu_chats_visible ?? true,
      statistics: shop.menu_statistics_visible ?? true,
      sidebar_sav_types: shop.sidebar_sav_types_visible ?? true,
      sidebar_sav_statuses: shop.sidebar_sav_statuses_visible ?? true,
      sidebar_late_sav: shop.sidebar_late_sav_visible ?? true
    };

    // Combiner : 
    // - Si forcé par admin : toujours activé (ignore les préférences boutique)
    // - Sinon : si le plan autorise ET que le magasin n'a pas désactivé
    const calculatedPerms: MenuPermissions = {
      dashboard: forcedFeatures.dashboard === true ? true : (basePermissions.dashboard && shopPreferences.dashboard),
      sav: forcedFeatures.sav === true ? true : (basePermissions.sav && shopPreferences.sav),
      parts: forcedFeatures.parts === true ? true : (basePermissions.parts && shopPreferences.parts),
      quotes: forcedFeatures.quotes === true ? true : (basePermissions.quotes && shopPreferences.quotes),
      orders: forcedFeatures.orders === true ? true : (basePermissions.orders && shopPreferences.orders),
      customers: forcedFeatures.customers === true ? true : (basePermissions.customers && shopPreferences.customers),
      chats: forcedFeatures.chats === true ? true : (basePermissions.chats && shopPreferences.chats),
      sidebar_sav_types: forcedFeatures.sidebar_sav_types === true ? true : (basePermissions.sidebar_sav_types && shopPreferences.sidebar_sav_types),
      sidebar_sav_statuses: forcedFeatures.sidebar_sav_statuses === true ? true : (basePermissions.sidebar_sav_statuses && shopPreferences.sidebar_sav_statuses),
      sidebar_late_sav: forcedFeatures.sidebar_late_sav === true ? true : (basePermissions.sidebar_late_sav && shopPreferences.sidebar_late_sav),
      statistics: forcedFeatures.statistics === true ? true : (basePermissions.statistics && shopPreferences.statistics)
    };
    
    // Sauvegarder les permissions valides
    lastValidPermissions.current = calculatedPerms;
    
    return calculatedPerms;
  }, [shop, menuConfig, shopLoading, featuresLoading]);

  const canToggleMenu = useMemo(() => {
    return (menuKey: keyof MenuPermissions) => {
      if (!shop || !menuConfig) return false;
      
      const forcedFeatures = (shop as any).forced_features || {};
      const planAllows = menuConfig[menuKey];
      const isForced = forcedFeatures[menuKey] === true;
      
      // Le magasin peut modifier si le plan autorise OU si c'est forcé par le super admin
      return planAllows || isForced;
    };
  }, [shop, menuConfig]);

  return {
    permissions,
    loading: shopLoading || featuresLoading,
    canToggleMenu
  };
}