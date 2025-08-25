import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShop } from './useShop';
import { startOfDay, endOfDay, subDays } from 'date-fns';

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
      const start = startOfDay(subDays(now, 30));
      const end = endOfDay(now);

      // Récupérer les coûts des pièces pour les SAV prêts de la période (et du shop)
      const { data: partsData, error: partsError } = await supabase
        .from('sav_parts')
        .select(`
          quantity,
          unit_price,
          parts!inner(purchase_price, selling_price),
          sav_cases!inner(id, sav_type, status, taken_over, partial_takeover, takeover_amount, total_cost, shop_id, created_at)
        `)
        .eq('sav_cases.status', 'ready')
        .eq('sav_cases.shop_id', shop.id)
        .gte('sav_cases.created_at', start.toISOString())
        .lte('sav_cases.created_at', end.toISOString());

      if (partsError) throw partsError;

      // Calculer les coûts par catégorie
      let takeover_cost = 0;
      let internal_cost = 0;
      let client_cost = 0;
      let external_cost = 0;
      let monthly_revenue = 0;

      if (partsData) {
        partsData.forEach((item: any) => {
          const qty = Number(item.quantity) || 0;
          const purchase = Number(item.parts?.purchase_price) || 0;
          const selling = Number(item.parts?.selling_price) || 0;
          const unit = Number(item.unit_price ?? selling) || 0;

          const partCost = purchase * qty;
          const partRevenue = unit * qty;
          const savCase = item.sav_cases;

          // CORRECTION: Coût prise en charge uniquement pour SAV prêts avec prise en charge magasin
          if (savCase.status === 'ready' && savCase.sav_type === 'client') {
            if (savCase.taken_over) {
              takeover_cost += partCost; // totalement pris en charge
            } else if (savCase.partial_takeover && savCase.takeover_amount) {
              const denom = Number(savCase.total_cost) || 1;
              const rawRatio = Number(savCase.takeover_amount) / denom;
              const ratio = Math.min(1, Math.max(0, rawRatio));
              takeover_cost += partCost * ratio;
              client_cost += partCost * (1 - ratio);
            } else {
              client_cost += partCost; // à la charge du client
            }
          } else if (savCase.sav_type === 'internal') {
            internal_cost += partCost;
          } else if (savCase.sav_type === 'external') {
            external_cost += partCost;
          }

          // Calcul du CA (exclure l'interne)
          if (savCase.sav_type !== 'internal') {
            let revenuePart = partRevenue;
            if (savCase.partial_takeover && savCase.takeover_amount) {
              const denom = Number(savCase.total_cost) || 1;
              const rawRatio = Number(savCase.takeover_amount) / denom;
              const ratio = Math.min(1, Math.max(0, rawRatio));
              revenuePart = partCost + (partRevenue - partCost) * (1 - ratio);
            } else if (savCase.taken_over) {
              revenuePart = partCost; // pas de marge en cas de prise en charge totale
            }
            monthly_revenue += revenuePart;
          }
        });
      }

      // Le CA a été calculé ci-dessus à partir des pièces et des règles de prise en charge
      // Ajouter les devis acceptés de la période au CA
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('total_amount, shop_id, created_at')
        .eq('status', 'accepted')
        .eq('shop_id', shop.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (quotesError) throw quotesError;

      if (quotesData) {
        monthly_revenue += quotesData.reduce((acc, quote) => acc + (Number(quote.total_amount) || 0), 0);
      }

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