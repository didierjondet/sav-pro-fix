import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { useToast } from '@/hooks/use-toast';

export type VatRegime = 'none' | 'standard' | 'margin';
export type LaborMode = 'flat' | 'hourly';

export interface BillingConfig {
  shop_id: string;
  vat_regime: VatRegime;
  vat_rate_parts: number;
  vat_rate_labor: number;
  prices_include_vat: boolean;
  labor_billing_enabled: boolean;
  labor_mode: LaborMode;
  labor_hourly_rate: number;
  labor_label: string;
}

export const DEFAULT_BILLING_CONFIG: Omit<BillingConfig, 'shop_id'> = {
  vat_regime: 'standard',
  vat_rate_parts: 20,
  vat_rate_labor: 20,
  prices_include_vat: true,
  labor_billing_enabled: false,
  labor_mode: 'flat',
  labor_hourly_rate: 60,
  labor_label: "Main d'œuvre",
};

export function useBillingConfig() {
  const { shop } = useShop();
  const qc = useQueryClient();
  const { toast } = useToast();
  const shopId = shop?.id;

  const { data: config, isLoading } = useQuery({
    queryKey: ['billing-config', shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    queryFn: async (): Promise<BillingConfig> => {
      const { data } = await supabase
        .from('shop_billing_config' as any)
        .select('*')
        .eq('shop_id', shopId!)
        .maybeSingle();
      if (data) return data as any as BillingConfig;
      return { shop_id: shopId!, ...DEFAULT_BILLING_CONFIG };
    },
  });

  const save = useMutation({
    mutationFn: async (updates: Partial<BillingConfig>) => {
      if (!shopId) throw new Error('Shop introuvable');
      const payload = { ...(config || { shop_id: shopId, ...DEFAULT_BILLING_CONFIG }), ...updates, shop_id: shopId };
      const { error } = await supabase
        .from('shop_billing_config' as any)
        .upsert(payload, { onConflict: 'shop_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-config', shopId] });
      toast({ title: 'Réglages enregistrés' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  return {
    config: config || ({ shop_id: shopId || '', ...DEFAULT_BILLING_CONFIG } as BillingConfig),
    isLoading,
    save: save.mutate,
    isSaving: save.isPending,
  };
}
