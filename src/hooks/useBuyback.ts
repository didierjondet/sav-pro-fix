import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';

export interface BuybackRequest {
  id: string;
  shop_id: string | null;
  public_token: string;
  category: string;
  brand: string | null;
  model: string | null;
  answers: Record<string, string>;
  media: { path: string; type: string }[];
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_city: string | null;
  customer_postal_code: string | null;
  status: string;
  network_open: boolean;
  network_deadline: string | null;
  created_at: string;
}

export interface BuybackOffer {
  id: string;
  request_id: string;
  shop_id: string;
  amount: number;
  message: string | null;
  conditions: string | null;
  status: string;
  is_network_offer: boolean;
  is_selected: boolean;
  created_at: string;
}

export interface NetworkBuybackRequest {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  answers: Record<string, string>;
  media: { path: string; type: string }[];
  customer_city: string | null;
  customer_postal_code: string | null;
  created_at: string;
  network_deadline: string | null;
  origin_shop_city: string | null;
  my_offer_amount: number | null;
  offers_count: number;
}

export function useBuyback() {
  const { shop } = useShop();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const shopId = shop?.id;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['buyback-requests', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('buyback_requests')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BuybackRequest[];
    },
    enabled: !!shopId,
    placeholderData: (prev) => prev,
  });

  const { data: offers = [] } = useQuery({
    queryKey: ['buyback-offers', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('buyback_offers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BuybackOffer[];
    },
    enabled: !!shopId,
    placeholderData: (prev) => prev,
  });

  const { data: networkRequests = [] } = useQuery({
    queryKey: ['buyback-network', shopId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_network_buyback_requests' as any);
      if (error) throw error;
      return (data ?? []) as unknown as NetworkBuybackRequest[];
    },
    enabled: !!shopId,
    placeholderData: (prev) => prev,
  });

  const sendOffer = useMutation({
    mutationFn: async (payload: {
      requestId: string;
      amount: number;
      message?: string;
      conditions?: string;
      validDays?: number;
      isNetwork?: boolean;
      ai?: { low?: number; mid?: number; high?: number };
    }) => {
      if (!shopId) throw new Error('Magasin introuvable');

      if (payload.isNetwork) {
        const { error } = await supabase.rpc('submit_network_buyback_offer' as any, {
          p_request_id: payload.requestId,
          p_amount: payload.amount,
          p_message: payload.message ?? null,
          p_conditions: payload.conditions ?? null,
          p_ai_low: payload.ai?.low ?? null,
          p_ai_mid: payload.ai?.mid ?? null,
          p_ai_high: payload.ai?.high ?? null,
        });
        if (error) throw error;
        return;
      }

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + (payload.validDays ?? 7));

      const { error } = await supabase.from('buyback_offers').upsert(
        {
          request_id: payload.requestId,
          shop_id: shopId,
          amount: payload.amount,
          message: payload.message ?? null,
          conditions: payload.conditions ?? null,
          valid_until: validUntil.toISOString(),
          is_network_offer: false,
          status: 'sent',
          ai_low: payload.ai?.low ?? null,
          ai_mid: payload.ai?.mid ?? null,
          ai_high: payload.ai?.high ?? null,
        } as any,
        { onConflict: 'request_id,shop_id' },
      );
      if (error) throw error;

      await supabase.from('buyback_requests').update({ status: 'offered' }).eq('id', payload.requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyback-requests', shopId] });
      queryClient.invalidateQueries({ queryKey: ['buyback-offers', shopId] });
      queryClient.invalidateQueries({ queryKey: ['buyback-network', shopId] });
      toast({ title: 'Offre envoyée au client' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const getSignedMediaUrl = async (path: string) => {
    const { data } = await supabase.storage.from('buyback-media').createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  };

  return { requests, offers, networkRequests, loading: isLoading, sendOffer, getSignedMediaUrl };
}

export function useBuybackAiEstimate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      category: string;
      brand?: string | null;
      model?: string | null;
      answers: Record<string, string>;
    }) => {
      const { data, error } = await supabase.functions.invoke('buyback-ai-estimate', { body: payload });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { low: number; mid: number; high: number; rationale: string };
    },
    onError: (e: any) =>
      toast({ title: 'Estimation indisponible', description: e.message, variant: 'destructive' }),
  });
}
