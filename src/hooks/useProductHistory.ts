import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrackedProduct {
  id: string;
  shop_id: string;
  device_imei: string | null;
  sku: string | null;
  device_brand: string | null;
  device_model: string | null;
  last_customer_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
  sav_count: number;
  notes: string | null;
}

export interface PreviousSAVCase {
  id: string;
  case_number: string;
  status: string;
  sav_type: string;
  device_brand: string;
  device_model: string;
  device_imei: string | null;
  sku: string | null;
  problem_description: string;
  repair_notes: string | null;
  technician_comments: string | null;
  total_cost: number;
  created_at: string;
  closure_history: any;
  customer?: { first_name: string; last_name: string } | null;
}

interface Params {
  shopId?: string | null;
  imei?: string | null;
  sku?: string | null;
  brand?: string | null;
  model?: string | null;
  excludeSavId?: string | null;
}

const normalizeImei = (v?: string | null) => (v || '').replace(/\s+/g, '').trim();

export function useProductHistory({ shopId, imei, sku, brand, model, excludeSavId }: Params) {
  const cleanImei = normalizeImei(imei);
  const hasValidImei = cleanImei.length >= 10;
  const cleanSku = (sku || '').trim();
  const cleanBrand = (brand || '').trim();
  const cleanModel = (model || '').trim();

  // 1) Match exact par IMEI -> fiche produit
  const productQuery = useQuery({
    queryKey: ['tracked-product', shopId, cleanImei],
    enabled: !!shopId && hasValidImei,
    staleTime: 30_000,
    queryFn: async (): Promise<TrackedProduct | null> => {
      const { data, error } = await supabase
        .from('tracked_products')
        .select('*')
        .eq('shop_id', shopId!)
        .eq('device_imei', cleanImei)
        .maybeSingle();
      if (error) throw error;
      return (data as TrackedProduct) || null;
    },
  });

  const trackedProduct = productQuery.data || null;

  // 2) Anciens SAV par fiche produit (si trouvée) sinon par IMEI direct
  const previousCasesQuery = useQuery({
    queryKey: ['product-previous-cases', shopId, trackedProduct?.id, cleanImei, excludeSavId],
    enabled: !!shopId && (!!trackedProduct?.id || hasValidImei),
    staleTime: 30_000,
    queryFn: async (): Promise<PreviousSAVCase[]> => {
      let query = supabase
        .from('sav_cases')
        .select(`
          id, case_number, status, sav_type, device_brand, device_model,
          device_imei, sku, problem_description, repair_notes, technician_comments,
          total_cost, created_at, closure_history,
          customer:customers(first_name, last_name)
        `)
        .eq('shop_id', shopId!)
        .order('created_at', { ascending: false });

      if (trackedProduct?.id) {
        query = query.eq('tracked_product_id', trackedProduct.id);
      } else if (hasValidImei) {
        query = query.eq('device_imei', cleanImei);
      }

      if (excludeSavId) {
        query = query.neq('id', excludeSavId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as PreviousSAVCase[];
    },
  });

  // 3) Suggestion par SKU / marque+modèle (sans IMEI fiable)
  const suggestionsQuery = useQuery({
    queryKey: ['product-suggestions', shopId, cleanSku, cleanBrand, cleanModel, excludeSavId],
    enabled: !!shopId && !hasValidImei && (cleanSku.length >= 3 || (cleanBrand.length >= 2 && cleanModel.length >= 2)),
    staleTime: 60_000,
    queryFn: async (): Promise<PreviousSAVCase[]> => {
      let query = supabase
        .from('sav_cases')
        .select(`
          id, case_number, status, sav_type, device_brand, device_model,
          device_imei, sku, problem_description, repair_notes, technician_comments,
          total_cost, created_at, closure_history,
          customer:customers(first_name, last_name)
        `)
        .eq('shop_id', shopId!)
        .order('created_at', { ascending: false })
        .limit(10);

      if (cleanSku.length >= 3) {
        query = query.eq('sku', cleanSku);
      } else {
        query = query.ilike('device_brand', cleanBrand).ilike('device_model', cleanModel);
      }

      if (excludeSavId) {
        query = query.neq('id', excludeSavId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as PreviousSAVCase[];
    },
  });

  const previousCases = previousCasesQuery.data || [];
  const suggestions = suggestionsQuery.data || [];

  const detection = useMemo(() => {
    if (trackedProduct && previousCases.length > 0) {
      return { level: 'exact' as const, count: previousCases.length };
    }
    if (!hasValidImei && suggestions.length > 0) {
      return { level: 'suggestion' as const, count: suggestions.length };
    }
    return { level: 'none' as const, count: 0 };
  }, [trackedProduct, previousCases.length, suggestions.length, hasValidImei]);

  return {
    trackedProduct,
    previousCases,
    suggestions,
    detection,
    isLoading: productQuery.isLoading || previousCasesQuery.isLoading || suggestionsQuery.isLoading,
  };
}

/** Récupère la fiche produit + l'historique à partir d'un tracked_product_id ou d'un SAV donné */
export function useProductHistoryById(trackedProductId?: string | null) {
  return useQuery({
    queryKey: ['tracked-product-by-id', trackedProductId],
    enabled: !!trackedProductId,
    queryFn: async () => {
      const [{ data: product, error: e1 }, { data: cases, error: e2 }] = await Promise.all([
        supabase.from('tracked_products').select('*').eq('id', trackedProductId!).maybeSingle(),
        supabase
          .from('sav_cases')
          .select(`
            id, case_number, status, sav_type, device_brand, device_model,
            device_imei, sku, problem_description, repair_notes, technician_comments,
            total_cost, created_at, closure_history,
            customer:customers(first_name, last_name)
          `)
          .eq('tracked_product_id', trackedProductId!)
          .order('created_at', { ascending: false }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return {
        product: (product as TrackedProduct) || null,
        cases: (cases || []) as unknown as PreviousSAVCase[],
      };
    },
  });
}
