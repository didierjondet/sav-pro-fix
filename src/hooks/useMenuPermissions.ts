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

    const basePermissions = { ...menuConfig };
    const forcedFeatures = (shop as any).forced_features || {};
    
    // Appliquer les overrides du super admin
    Object.keys(forcedFeatures).forEach(key => {
      if (key in basePermissions) {
        (basePermissions as any)[key] = forcedFeatures[key];
      }
    });

    // Appliquer les préférences utilisateur du magasin (ne peut que désactiver, pas activer)
    const shopPreferences = {
      dashboard: (shop as any).menu_dashboard_visible ?? true,
      sav: (shop as any).menu_sav_visible ?? true,
      parts: (shop as any).menu_parts_visible ?? true,
      quotes: (shop as any).menu_quotes_visible ?? true,
      orders: (shop as any).menu_orders_visible ?? true,
      customers: (shop as any).menu_customers_visible ?? true,
      chats: (shop as any).menu_chats_visible ?? true,
      statistics: (shop as any).menu_statistics_visible ?? true,
      sidebar_sav_types: (shop as any).sidebar_sav_types_visible ?? true,
      sidebar_sav_statuses: (shop as any).sidebar_sav_statuses_visible ?? true,
      sidebar_late_sav: (shop as any).sidebar_late_sav_visible ?? true
    };

    // Combiner : si le plan autorise ET que le magasin n'a pas désactivé
    const calculatedPerms: MenuPermissions = {
      dashboard: basePermissions.dashboard && shopPreferences.dashboard,
      sav: basePermissions.sav && shopPreferences.sav,
      parts: basePermissions.parts && shopPreferences.parts,
      quotes: basePermissions.quotes && shopPreferences.quotes,
      orders: basePermissions.orders && shopPreferences.orders,
      customers: basePermissions.customers && shopPreferences.customers,
      chats: basePermissions.chats && shopPreferences.chats,
      sidebar_sav_types: basePermissions.sidebar_sav_types && shopPreferences.sidebar_sav_types,
      sidebar_sav_statuses: basePermissions.sidebar_sav_statuses && shopPreferences.sidebar_sav_statuses,
      sidebar_late_sav: basePermissions.sidebar_late_sav && shopPreferences.sidebar_late_sav,
      statistics: basePermissions.statistics && shopPreferences.statistics
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