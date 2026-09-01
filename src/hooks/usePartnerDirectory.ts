import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProPartner {
  shop_id: string;
  partner_code: string | null;
  slug: string | null;
  public_name: string;
  logo_url: string | null;
  city: string | null;
  postal_code: string | null;
  coverage_area: string | null;
  public_phone: string | null;
  public_email: string | null;
  description: string | null;
  specialties: string | null;
  certifications: string | null;
  warranty_terms: string | null;
  shipping_modes: string | null;
  avg_delay_days: number | null;
  return_policy: string | null;
  failure_policy: string | null;
  prices_include_vat: boolean;
  vat_rate: number;
  vat_exempt: boolean;
  pro_prices: Array<{
    label: string;
    device_family: string | null;
    pro_price: number | null;
    public_price: number | null;
    delay_days: number | null;
    note: string | null;
  }>;
}

export interface PublicPartner {
  slug: string;
  public_name: string;
  logo_url: string | null;
  city: string | null;
  postal_code: string | null;
  coverage_area: string | null;
  description: string | null;
  specialties: string | null;
  avg_delay_days: number | null;
  certifications: string | null;
}

/** Annuaire professionnel : uniquement pour les magasins connectés. */
export function useProPartnerDirectory(search: string) {
  return useQuery({
    queryKey: ['pro-partner-directory', search],
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<ProPartner[]> => {
      const { data, error } = await supabase.rpc('get_pro_partner_directory', {
        _search: search || null,
      });
      if (error) throw error;
      return ((data || []) as any[]).map((p) => ({
        ...p,
        pro_prices: Array.isArray(p.pro_prices) ? p.pro_prices : [],
      })) as ProPartner[];
    },
  });
}

/** Annuaire public : accessible sans compte. */
export function usePublicPartnerDirectory(search: string) {
  return useQuery({
    queryKey: ['public-partner-directory', search],
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<PublicPartner[]> => {
      const { data, error } = await supabase.rpc('get_public_partner_directory', {
        _search: search || null,
      });
      if (error) throw error;
      return (data || []) as PublicPartner[];
    },
  });
}

export function usePublicPartner(slug?: string) {
  return useQuery({
    queryKey: ['public-partner', slug],
    enabled: !!slug,
    queryFn: async (): Promise<any | null> => {
      const { data, error } = await supabase.rpc('get_public_partner', { _slug: slug! });
      if (error) throw error;
      return data ?? null;
    },
  });
}

/** Liaison d'une fiche prestataire locale à un vrai compte Fixway. */
export function usePartnerLink() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resolveCode = async (code: string) => {
    const { data, error } = await supabase.rpc('resolve_partner_code', { _code: code });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return (row as any) || null;
  };

  const linkProvider = async (providerId: string, code: string) => {
    const resolved = await resolveCode(code);
    if (!resolved) {
      toast({
        title: 'Code partenaire inconnu',
        description: 'Vérifiez le code communiqué par votre partenaire.',
        variant: 'destructive',
      });
      return null;
    }
    const { error } = await supabase
      .from('shop_sav_providers')
      .update({ linked_shop_id: resolved.shop_id, linked_at: new Date().toISOString() } as any)
      .eq('id', providerId);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Partenaire Fixway connecté', description: resolved.public_name || resolved.shop_name });
    queryClient.invalidateQueries({ queryKey: ['sav-providers'] });
    return resolved;
  };

  const unlinkProvider = async (providerId: string) => {
    const { error } = await supabase
      .from('shop_sav_providers')
      .update({ linked_shop_id: null, linked_at: null } as any)
      .eq('id', providerId);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Partenaire délié' });
    queryClient.invalidateQueries({ queryKey: ['sav-providers'] });
  };

  return { resolveCode, linkProvider, unlinkProvider };
}
