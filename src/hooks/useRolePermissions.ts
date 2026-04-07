import { useQuery } from '@tanstack/react-query';
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

const ALL_TRUE: RolePermissions = {
  menu_dashboard: true,
  menu_sav: true,
  menu_parts: true,
  menu_quotes: true,
  menu_orders: true,
  menu_customers: true,
  menu_chats: true,
  menu_agenda: true,
  menu_reports: true,
  menu_statistics: true,
  menu_settings: true,
  settings_subscription: true,
  settings_sms_purchase: true,
  settings_users: true,
  settings_import_export: true,
  sav_logs: true,
  can_delete_sav: true,
  can_create_quotes: true,
  can_manage_stock: true,
  simplified_view_default: false,
};

export function useRolePermissions() {
  const { profile } = useProfile();
  const { shop } = useShop();
  const lastValid = useRef<RolePermissions>(ALL_TRUE);

  const userRole = profile?.role || 'technician';
  const shopId = shop?.id;
  const isSuperAdmin = userRole === 'super_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['role-permissions', shopId, userRole],
    queryFn: async (): Promise<RolePermissions> => {
      if (!shopId || isSuperAdmin) return ALL_TRUE;

      const { data: shopPerms } = await supabase
        .from('shop_role_permissions' as any)
        .select('permissions')
        .eq('shop_id', shopId)
        .eq('role', userRole)
        .maybeSingle() as any;

      if (shopPerms?.permissions) {
        return { ...ALL_TRUE, ...shopPerms.permissions } as RolePermissions;
      }

      const { data: defaultPerms } = await supabase
        .from('default_role_permissions' as any)
        .select('permissions')
        .eq('role', userRole)
        .maybeSingle() as any;

      if (defaultPerms?.permissions) {
        return { ...ALL_TRUE, ...defaultPerms.permissions } as RolePermissions;
      }

      return ALL_TRUE;
    },
    enabled: !!shopId && !!userRole && !isSuperAdmin,
    staleTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Realtime subscription
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
        // Invalidate will be handled by React Query
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shopId]);

  const result = data || lastValid.current;
  if (data) lastValid.current = data;

  return { rolePermissions: result, loading: isLoading };
}
