import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

export interface PartnerProfile {
  id: string;
  shop_id: string;
  slug: string | null;
  public_name: string;
  logo_url: string | null;
  city: string | null;
  postal_code: string | null;
  coverage_area: string | null;
  public_phone: string | null;
  public_email: string | null;
  website_url: string | null;
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
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerPriceItem {
  id: string;
  profile_id: string;
  shop_id: string;
  label: string;
  device_family: string | null;
  public_price: number | null;
  pro_price: number | null;
  delay_days: number | null;
  note: string | null;
  visible_public: boolean;
  visible_pro: boolean;
  display_order: number;
}

/** Fiche partenaire du magasin courant + grille tarifaire. */
export function usePartnerProfile() {
  const { profile } = useProfile();
  const shopId = profile?.shop_id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['partner-profile', shopId],
    enabled: !!shopId,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<PartnerProfile | null> => {
      const { data, error } = await supabase
        .from('partner_profiles')
        .select('*')
        .eq('shop_id', shopId!)
        .maybeSingle();
      if (error) throw error;
      return (data as PartnerProfile) || null;
    },
  });

  const partnerProfile = profileQuery.data ?? null;

  const pricesQuery = useQuery({
    queryKey: ['partner-price-items', partnerProfile?.id],
    enabled: !!partnerProfile?.id,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<PartnerPriceItem[]> => {
      const { data, error } = await supabase
        .from('partner_price_items')
        .select('*')
        .eq('profile_id', partnerProfile!.id)
        .order('display_order', { ascending: true })
        .order('label', { ascending: true });
      if (error) throw error;
      return (data || []) as PartnerPriceItem[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['partner-profile'] });
    queryClient.invalidateQueries({ queryKey: ['partner-price-items'] });
  };

  const saveProfile = async (values: Partial<PartnerProfile>) => {
    if (!shopId) throw new Error('Magasin introuvable');
    try {
      if (partnerProfile) {
        const { error } = await supabase
          .from('partner_profiles')
          .update(values as any)
          .eq('id', partnerProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('partner_profiles').insert({
          shop_id: shopId,
          public_name: values.public_name || 'Mon atelier',
          ...(values as any),
        });
        if (error) throw error;
      }
      toast({ title: 'Fiche partenaire enregistrée' });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const savePriceItem = async (values: Partial<PartnerPriceItem> & { id?: string }) => {
    if (!shopId || !partnerProfile) throw new Error('Créez d’abord votre fiche partenaire');
    try {
      if (values.id) {
        const { id, ...rest } = values;
        const { error } = await supabase.from('partner_price_items').update(rest as any).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('partner_price_items').insert({
          profile_id: partnerProfile.id,
          shop_id: shopId,
          label: values.label || 'Prestation',
          device_family: values.device_family ?? null,
          public_price: values.public_price ?? null,
          pro_price: values.pro_price ?? null,
          delay_days: values.delay_days ?? null,
          note: values.note ?? null,
          visible_public: values.visible_public ?? true,
          visible_pro: values.visible_pro ?? true,
          display_order: values.display_order ?? 0,
        });
        if (error) throw error;
      }
      invalidate();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const deletePriceItem = async (id: string) => {
    try {
      const { error } = await supabase.from('partner_price_items').delete().eq('id', id);
      if (error) throw error;
      invalidate();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  return {
    partnerProfile,
    priceItems: pricesQuery.data ?? [],
    isLoading: profileQuery.isLoading,
    saveProfile,
    savePriceItem,
    deletePriceItem,
    refetch: profileQuery.refetch,
  };
}
