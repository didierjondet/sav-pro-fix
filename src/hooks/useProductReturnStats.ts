import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { computeReturnRate } from '@/lib/productReturnRate';

type Period = '7d' | '30d' | '1m_calendar' | '3m' | '6m' | '1y';

const periodStart = (period: Period): Date => {
  const now = new Date();
  switch (period) {
    case '7d': return new Date(now.getTime() - 7 * 86400000);
    case '30d': return new Date(now.getTime() - 30 * 86400000);
    case '1m_calendar': return new Date(now.getFullYear(), now.getMonth(), 1);
    case '3m': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case '6m': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case '1y': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
};

export interface ProductReturnStats {
  totalReturns: number;
  sameIssueReturns: number;
  otherIssueReturns: number;
  totalCasesInPeriod: number;
  returnRate: number;
  sameIssueRate: number;
  topProducts: Array<{
    trackedProductId: string;
    brand: string | null;
    model: string | null;
    imeiMasked: string | null;
    totalCases: number;
    returnCount: number;
    sameIssueCount: number;
  }>;
}

const maskImei = (imei: string | null | undefined): string | null => {
  if (!imei) return null;
  if (imei.length < 6) return imei;
  return `${imei.slice(0, 4)}…${imei.slice(-3)}`;
};

export function useProductReturnStats(period: Period) {
  const { shop } = useShop();
  return useQuery({
    queryKey: ['product-return-stats', shop?.id, period],
    enabled: !!shop?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<ProductReturnStats> => {
      const start = periodStart(period);
      // Récupérer tous les SAV liés à un produit suivi sur la période
      const { data: periodCases, error: e1 } = await supabase
        .from('sav_cases')
        .select('id, tracked_product_id, created_at, problem_description, device_brand, device_model, device_imei')
        .eq('shop_id', shop!.id)
        .gte('created_at', start.toISOString())
        .not('tracked_product_id', 'is', null);
      if (e1) throw e1;

      const productIds = Array.from(
        new Set((periodCases || []).map((c: any) => c.tracked_product_id).filter(Boolean))
      );

      if (productIds.length === 0) {
        return {
          totalReturns: 0,
          sameIssueReturns: 0,
          otherIssueReturns: 0,
          totalCasesInPeriod: 0,
          returnRate: 0,
          sameIssueRate: 0,
          topProducts: [],
        };
      }

      // Pour chaque produit, on a besoin de l'historique COMPLET pour savoir
      // si un SAV de la période est un retour (par rapport à un SAV antérieur hors période).
      const { data: allCases, error: e2 } = await supabase
        .from('sav_cases')
        .select('id, tracked_product_id, created_at, problem_description')
        .eq('shop_id', shop!.id)
        .in('tracked_product_id', productIds);
      if (e2) throw e2;

      const { data: products, error: e3 } = await supabase
        .from('tracked_products')
        .select('id, device_brand, device_model, device_imei')
        .in('id', productIds);
      if (e3) throw e3;

      const productMap = new Map<string, any>((products || []).map((p: any) => [p.id, p]));
      const casesByProduct = new Map<string, any[]>();
      (allCases || []).forEach((c: any) => {
        const arr = casesByProduct.get(c.tracked_product_id) || [];
        arr.push(c);
        casesByProduct.set(c.tracked_product_id, arr);
      });

      const periodCaseIds = new Set((periodCases || []).map((c: any) => c.id));

      let totalReturns = 0;
      let sameIssueReturns = 0;
      let otherIssueReturns = 0;
      const top: ProductReturnStats['topProducts'] = [];

      for (const [pid, list] of casesByProduct.entries()) {
        const res = computeReturnRate(list);
        let prodReturns = 0;
        let prodSame = 0;
        // Compter uniquement les SAV de la période
        for (const c of list) {
          if (!periodCaseIds.has(c.id)) continue;
          const cls = res.classification[c.id];
          if (cls === 'same') {
            sameIssueReturns++;
            prodReturns++;
            prodSame++;
          } else if (cls === 'other') {
            otherIssueReturns++;
            prodReturns++;
          }
        }
        totalReturns += prodReturns;
        if (prodReturns > 0) {
          const p = productMap.get(pid);
          top.push({
            trackedProductId: pid,
            brand: p?.device_brand ?? null,
            model: p?.device_model ?? null,
            imeiMasked: maskImei(p?.device_imei),
            totalCases: list.length,
            returnCount: prodReturns,
            sameIssueCount: prodSame,
          });
        }
      }

      top.sort((a, b) => b.returnCount - a.returnCount || b.sameIssueCount - a.sameIssueCount);

      const totalCasesInPeriod = (periodCases || []).length;
      const returnRate = totalCasesInPeriod > 0 ? (totalReturns / totalCasesInPeriod) * 100 : 0;
      const sameIssueRate = totalCasesInPeriod > 0 ? (sameIssueReturns / totalCasesInPeriod) * 100 : 0;

      return {
        totalReturns,
        sameIssueReturns,
        otherIssueReturns,
        totalCasesInPeriod,
        returnRate,
        sameIssueRate,
        topProducts: top.slice(0, 5),
      };
    },
  });
}
