import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserProfile {
  id: string;
  user_id: string;
  shop_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'admin' | 'technician' | 'super_admin' | 'shop_admin';
  created_at: string;
  updated_at: string;
}

// Helper functions for impersonation state
export function getImpersonatedShopId(): string | null {
  return localStorage.getItem('fixway_impersonated_shop_id');
}

export function setImpersonatedShopId(shopId: string) {
  localStorage.setItem('fixway_impersonated_shop_id', shopId);
}

export function clearImpersonation() {
  localStorage.removeItem('fixway_impersonated_shop_id');
}

export function isImpersonating(): boolean {
  return !!localStorage.getItem('fixway_impersonated_shop_id');
}

export function useProfile() {
  const { user } = useAuth();
  
  const { data: profile, isLoading: loading, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  // Build effective profile: if super_admin is impersonating, override shop_id and role
  const impersonatedShopId = getImpersonatedShopId();
  const isInImpersonationMode = !!impersonatedShopId && profile?.role === 'super_admin';

  const effectiveProfile = isInImpersonationMode && profile
    ? { ...profile, shop_id: impersonatedShopId, role: 'admin' as const }
    : profile;

  return {
    profile: effectiveProfile ?? null,
    actualProfile: profile ?? null,
    loading,
    refetch,
    isImpersonating: isInImpersonationMode,
  };
}
