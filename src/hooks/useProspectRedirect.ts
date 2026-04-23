import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SETTING_KEY = 'prospect_redirect_enabled';

export function useProspectRedirect() {
  const { data, isLoading } = useQuery({
    queryKey: ['app_global_settings', SETTING_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_global_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();
      if (error) {
        console.error('useProspectRedirect error:', error);
        return true; // default to enabled
      }
      // value is jsonb (boolean)
      if (data?.value === false || data?.value === 'false') return false;
      return true;
    },
    staleTime: 60_000,
    refetchOnMount: true,
  });

  return {
    enabled: data ?? true,
    isLoading,
  };
}

export const PROSPECT_REDIRECT_SETTING_KEY = SETTING_KEY;
