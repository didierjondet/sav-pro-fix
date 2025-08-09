import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  const fetchCosts = async () => {
    try {
      // Récupérer les coûts des pièces pour les SAV prêts uniquement
      const { data: partsData, error: partsError } = await supabase
        .from('sav_parts')
        .select(`
          quantity,
          parts!inner(purchase_price),
          sav_cases!inner(sav_type, status, taken_over, partial_takeover, takeover_amount, total_cost)
        `)
        .eq('sav_cases.status', 'ready');

      if (partsError) throw partsError;

      // Calculer les coûts par catégorie
      let takeover_cost = 0;
      let internal_cost = 0;
      let client_cost = 0;
      let external_cost = 0;
      let monthly_revenue = 0;

      if (partsData) {
        partsData.forEach((item: any) => {
          const partCost = (item.parts.purchase_price || 0) * item.quantity;
          const savCase = item.sav_cases;
          
          if (savCase.sav_type === 'client') {
            if (savCase.taken_over) {
              // SAV totalement pris en charge
              takeover_cost += partCost;
            } else if (savCase.partial_takeover) {
              // SAV partiellement pris en charge
              const takeoverRatio = savCase.takeover_amount / (savCase.total_cost || 1);
              takeover_cost += partCost * takeoverRatio;
              client_cost += partCost * (1 - takeoverRatio);
            } else {
              // SAV entièrement à la charge du client
              client_cost += partCost;
            }
            } else if (savCase.sav_type === 'internal') {
              internal_cost += partCost;
            } else if (savCase.sav_type === 'external') {
              external_cost += partCost;
            }
          });
      }

      // Calculer le CA du mois (SAV ready uniquement)
      const { data: savData, error: savError } = await supabase
        .from('sav_cases')
        .select('total_cost, sav_type')
        .eq('status', 'ready')
        .neq('sav_type', 'internal');

      if (savError) throw savError;

      if (savData) {
        monthly_revenue = savData.reduce((acc, sav) => acc + (sav.total_cost || 0), 0);
      }

      // Ajouter les devis acceptés au CA
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('total_amount')
        .eq('status', 'accepted');

      if (quotesError) throw quotesError;

      if (quotesData) {
        monthly_revenue += quotesData.reduce((acc, quote) => acc + (quote.total_amount || 0), 0);
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
  }, []);

  return {
    costs,
    loading,
    refetch: fetchCosts,
  };
}