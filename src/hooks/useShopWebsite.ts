import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';

export interface ShopWebsiteConfig {
  id: string;
  shop_id: string;
  enabled: boolean;
  tagline: string | null;
  about: string | null;
  hero_image_url: string | null;
  opening_hours: { day: string; open: string; close: string; closed?: boolean }[];
  social_links: Record<string, string>;
  show_services: boolean;
  show_reviews: boolean;
  buyback_enabled: boolean;
  buyback_categories: string[];
  buyback_auto_accept: boolean;
  buyback_intro: string | null;
}

export interface ShopWebsitePhoto {
  id: string;
  shop_id: string;
  url: string;
  caption: string | null;
  display_order: number;
}

export const DEFAULT_OPENING_HOURS = [
  { day: 'Lundi', open: '09:00', close: '18:00', closed: false },
  { day: 'Mardi', open: '09:00', close: '18:00', closed: false },
  { day: 'Mercredi', open: '09:00', close: '18:00', closed: false },
  { day: 'Jeudi', open: '09:00', close: '18:00', closed: false },
  { day: 'Vendredi', open: '09:00', close: '18:00', closed: false },
  { day: 'Samedi', open: '10:00', close: '17:00', closed: false },
  { day: 'Dimanche', open: '', close: '', closed: true },
];

export function useShopWebsite() {
  const { shop } = useShop();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const shopId = shop?.id;

  const { data: config, isLoading } = useQuery({
    queryKey: ['shop-website-config', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      const { data, error } = await supabase
        .from('shop_website_config')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ShopWebsiteConfig | null;
    },
    enabled: !!shopId,
    placeholderData: (prev) => prev,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['shop-website-photos', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('shop_website_photos')
        .select('*')
        .eq('shop_id', shopId)
        .order('display_order');
      if (error) throw error;
      return (data ?? []) as unknown as ShopWebsitePhoto[];
    },
    enabled: !!shopId,
    placeholderData: (prev) => prev,
  });

  const saveConfig = useMutation({
    mutationFn: async (values: Partial<ShopWebsiteConfig>) => {
      if (!shopId) throw new Error('Magasin introuvable');
      const { error } = await supabase
        .from('shop_website_config')
        .upsert({ shop_id: shopId, ...values } as any, { onConflict: 'shop_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-website-config', shopId] });
      toast({ title: 'Site enregistré' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const addPhoto = useMutation({
    mutationFn: async ({ url, caption }: { url: string; caption?: string }) => {
      if (!shopId) throw new Error('Magasin introuvable');
      const { error } = await supabase.from('shop_website_photos').insert({
        shop_id: shopId,
        url,
        caption: caption ?? null,
        display_order: photos.length,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop-website-photos', shopId] }),
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shop_website_photos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop-website-photos', shopId] }),
  });

  return { config, photos, loading: isLoading, saveConfig, addPhoto, deletePhoto };
}
