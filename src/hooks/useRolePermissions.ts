import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useShop } from './useShop';
import { getRolePermissionDefaults, type RolePermissions } from '@/lib/rolePermissions';

function getDefaultForRole(role: string): RolePermissions {
  return getRolePermissionDefaults(role);
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
      if (!shopId || isSuperAdmin) return getRolePermissionDefaults('admin');

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

  if (isSuperAdmin) return { rolePermissions: getRolePermissionDefaults('admin'), loading: false };

  // Use loaded data, or role-specific safe default while loading
  const result = data || roleDefault;

  return { rolePermissions: result, loading: isLoading && !data };
}
