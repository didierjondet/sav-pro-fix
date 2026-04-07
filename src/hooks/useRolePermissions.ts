import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useShop } from './useShop';

export interface RolePermissions {
  menu_dashboard: boolean;
  menu_sav: boolean;
  menu_parts: boolean;
  menu_quotes: boolean;
  menu_orders: boolean;
  menu_customers: boolean;
  menu_chats: boolean;
  menu_agenda: boolean;
  menu_reports: boolean;
  menu_statistics: boolean;
  menu_settings: boolean;
  settings_subscription: boolean;
  settings_sms_purchase: boolean;
  settings_users: boolean;
  settings_import_export: boolean;
  sav_logs: boolean;
  can_delete_sav: boolean;
  can_create_quotes: boolean;
  can_manage_stock: boolean;
  simplified_view_default: boolean;
}

// Role-specific SAFE defaults (fail-closed)
const ROLE_DEFAULTS: Record<string, RolePermissions> = {
  admin: {
    menu_dashboard: true, menu_sav: true, menu_parts: true, menu_quotes: true,
    menu_orders: true, menu_customers: true, menu_chats: true, menu_agenda: true,
    menu_reports: true, menu_statistics: true, menu_settings: true,
    settings_subscription: true, settings_sms_purchase: true, settings_users: true,
    settings_import_export: true, sav_logs: true, can_delete_sav: true,
    can_create_quotes: true, can_manage_stock: true, simplified_view_default: false,
  },
  technician: {
    menu_dashboard: true, menu_sav: true, menu_parts: true, menu_quotes: true,
    menu_orders: true, menu_customers: true, menu_chats: true, menu_agenda: true,
    menu_reports: false, menu_statistics: false, menu_settings: true,
    settings_subscription: false, settings_sms_purchase: false, settings_users: false,
    settings_import_export: false, sav_logs: false, can_delete_sav: false,
    can_create_quotes: true, can_manage_stock: true, simplified_view_default: false,
  },
  shop_admin: {
    menu_dashboard: true, menu_sav: true, menu_parts: true, menu_quotes: true,
    menu_orders: false, menu_customers: true, menu_chats: true, menu_agenda: true,
    menu_reports: false, menu_statistics: false, menu_settings: false,
    settings_subscription: false, settings_sms_purchase: false, settings_users: false,
    settings_import_export: false, sav_logs: false, can_delete_sav: false,
    can_create_quotes: true, can_manage_stock: true, simplified_view_default: true,
  },
};

function getDefaultForRole(role: string): RolePermissions {
  return ROLE_DEFAULTS[role] || ROLE_DEFAULTS.technician;
}

export function useRolePermissions() {
  const { profile } = useProfile();
  const { shop } = useShop();
  const queryClient = useQueryClient();

  const userRole = profile?.role || 'technician';
  const shopId = shop?.id;
  const isSuperAdmin = userRole === 'super_admin';

  const roleDefault = getDefaultForRole(userRole);

  const { data, isLoading } = useQuery({
    queryKey: ['role-permissions', shopId, userRole],
    queryFn: async (): Promise<RolePermissions> => {
      if (!shopId || isSuperAdmin) return ROLE_DEFAULTS.admin;

      const { data: shopPerms } = await supabase
        .from('shop_role_permissions' as any)
        .select('permissions')
        .eq('shop_id', shopId)
        .eq('role', userRole)
        .maybeSingle() as any;

      if (shopPerms?.permissions) {
        return { ...roleDefault, ...shopPerms.permissions } as RolePermissions;
      }

      const { data: defaultPerms } = await supabase
        .from('default_role_permissions' as any)
        .select('permissions')
        .eq('role', userRole)
        .maybeSingle() as any;

      if (defaultPerms?.permissions) {
        return { ...roleDefault, ...defaultPerms.permissions } as RolePermissions;
      }

      return roleDefault;
    },
    enabled: !!shopId && !!userRole && !isSuperAdmin,
    staleTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Realtime: invalidate on shop_role_permissions changes
  useEffect(() => {
    if (!shopId) return;

    const channel = supabase
      .channel('role-permissions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shop_role_permissions',
        filter: `shop_id=eq.${shopId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['role-permissions', shopId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shopId, queryClient]);

  // Also listen for profile role changes
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('profile-role-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profile.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, queryClient]);

  if (isSuperAdmin) return { rolePermissions: ROLE_DEFAULTS.admin, loading: false };

  // Use loaded data, or role-specific safe default while loading
  const result = data || roleDefault;

  return { rolePermissions: result, loading: isLoading && !data };
}
