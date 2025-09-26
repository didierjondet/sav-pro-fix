import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCurrentShop() {
  return useQuery({
    queryKey: ['current-shop'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error('Not authenticated');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.user.id)
        .single();

      if (error) throw error;
      return profile?.shop_id;
    },
    staleTime: 1000 * 60 * 15, // 15 minutes - shop_id ne change jamais
    retry: 1,
  });
}