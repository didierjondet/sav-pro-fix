import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShop } from './useShop';
import { startOfMonth, endOfMonth } from 'date-fns';
import { computeCaseFinance, computeQuoteRevenue, fetchCountedQuotes, fetchFinanceContext, FINANCE_PARTS_SELECT } from '@/lib/savFinance';

export interface SAVPartsCost {
  takeover_cost: number;     // Coût prise en charge (SAV client taken_over = true)
  internal_cost: number;     // Coût SAV magasin (à exclure des marges/CA)
  client_cost: number;       // Coût SAV client (taken_over = false)
  external_cost: number;     // Coût SAV externe (inclus dans les marges/CA)
  monthly_revenue: number;   // CA (SAV prêts non internes + devis acceptés)
}

export function useSAVPartsCosts() {
  const [costs, setCosts] = useState<SAVPartsCost>({
    takeover_cost: 0,
    internal_cost: 0,
    client_cost: 0,
    external_cost: 0,
    monthly_revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { shop } = useShop();

  const fetchCosts = async () => {
    try {
      setLoading(true);
      if (!shop?.id) {
        setLoading(false);
        return;
      }
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);

      // Règle commune (src/lib/savFinance.ts)
      const ctx = await fetchFinanceContext(shop.id);

      const { data: cases, error: casesError } = await supabase
        .from('sav_cases')
        .select(`id, sav_type, status, taken_over, partial_takeover, takeover_amount, ${FINANCE_PARTS_SELECT}`)
        .eq('shop_id', shop.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      if (casesError) throw casesError;

      let takeover_cost = 0;
      let internal_cost = 0;
      let client_cost = 0;
      let external_cost = 0;
      let monthly_revenue = 0;

      (cases || []).forEach((c: any) => {
        const f = computeCaseFinance(c, ctx);
        if (!f.counted) return;
        monthly_revenue += f.revenueHT;
        const takeoverShare = f.rawRevenueTTC > 0 ? Math.min(1, f.takeoverTTC / f.rawRevenueTTC) : (c.taken_over ? 1 : 0);
        const takenCost = f.cost * takeoverShare;
        const rest = f.cost - takenCost;
        takeover_cost += takenCost;
        if (c.sav_type === 'internal') internal_cost += rest;
        else if (c.sav_type === 'external') external_cost += rest;
        else client_cost += rest;
      });

      const quotes = await fetchCountedQuotes(shop.id, start, end);
      quotes.forEach((q: any) => {
        monthly_revenue += computeQuoteRevenue(q, ctx.billing).revenueHT;
      });

      setCosts({
        takeover_cost,
        internal_cost,
        client_cost,
        external_cost,
        monthly_revenue,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les coûts SAV",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, [shop?.id]);

  return {
    costs,
    loading,
    refetch: fetchCosts,
  };
}