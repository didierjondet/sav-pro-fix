import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const WHITE_LABEL_SETTING_KEY = 'white_label_hide_legal';

/**
 * Remplace toute mention de l'entreprise HAPICS par "Didier Jondet".
 */
export function maskCompanyName(text: string | null | undefined): string {
  if (!text) return text ?? '';
  return text
    .replace(/\bSASU?\s+HAPICS\b/gi, 'Didier Jondet')
    .replace(/\bHAPICS\b/gi, 'Didier Jondet');
}

export function applyMask(text: string | null | undefined, enabled: boolean): string | null {
  if (text === null || text === undefined) return text ?? null;
  return enabled ? maskCompanyName(text) : text;
}

export function useLegalVisibility() {
  const { data, isLoading } = useQuery({
    queryKey: ['app_global_settings', WHITE_LABEL_SETTING_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_global_settings')
        .select('value')
        .eq('key', WHITE_LABEL_SETTING_KEY)
        .maybeSingle();
      if (error) {
        console.error('useLegalVisibility error:', error);
        return false;
      }
      return data?.value === true || data?.value === 'true';
    },
    staleTime: 60_000,
    refetchOnMount: true,
  });

  const hideLegal = data ?? false;

  return {
    hideLegal,
    isLoading,
    mask: (text: string | null | undefined) => applyMask(text, hideLegal),
  };
}
