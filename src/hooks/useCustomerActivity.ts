import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CustomerActivity {
  id: string;
  type: 'sav' | 'quote';
  number: string;
  date: string;
  status: string;
  total_cost: number;
  revenue: number; // Ce que le client a payé
  profit: number;  // Bénéfice du magasin
  description: string;
}

export interface CustomerStats {
  total_revenue: number;
  total_profit: number;
  total_sav: number;
  total_quotes: number;
  accepted_quotes: number;
}

export function useCustomerActivity(customerId: string) {
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total_revenue: 0,
    total_profit: 0,
    total_sav: 0,
    total_quotes: 0,
    accepted_quotes: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomerActivity = async () => {
    try {
      setLoading(true);
      
      // Récupérer les SAV du client
      const { data: savData, error: savError } = await supabase
        .from('sav_cases')
        .select(`
          id,
          case_number,
          created_at,
          status,
          total_cost,
          problem_description,
          sav_type,
          taken_over,
          partial_takeover,
          takeover_amount
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (savError) throw savError;

      // Récupérer les pièces de tous les SAV du client pour calculer les vrais coûts
      const savIds = (savData || []).map(s => s.id);
      let partsMap: Record<string, { totalSelling: number; totalPurchase: number }> = {};

      if (savIds.length > 0) {
        const { data: partsData, error: partsError } = await supabase
          .from('sav_parts')
          .select('sav_case_id, unit_price, purchase_price, quantity')
          .in('sav_case_id', savIds);

        if (partsError) throw partsError;

        (partsData || []).forEach((part) => {
          const caseId = part.sav_case_id;
          if (!caseId) return;
          if (!partsMap[caseId]) {
            partsMap[caseId] = { totalSelling: 0, totalPurchase: 0 };
          }
          const qty = Number(part.quantity) || 0;
          partsMap[caseId].totalSelling += (Number(part.unit_price) || 0) * qty;
          partsMap[caseId].totalPurchase += (Number(part.purchase_price) || 0) * qty;
        });
      }

      // Récupérer les devis du client (simplifier pour l'instant)
      const quotesData: any[] = []; // Temporaire jusqu'à ce que la relation soit créée

      // Traiter les activités SAV
      const savActivities: CustomerActivity[] = (savData || []).map((sav) => {
        const parts = partsMap[sav.id] || { totalSelling: 0, totalPurchase: 0 };
        let revenue = 0;
        let profit = 0;
        
        if (sav.taken_over) {
          // SAV totalement pris en charge par le magasin — client ne paie rien
          revenue = 0;
          profit = -parts.totalPurchase;
        } else if (sav.partial_takeover && sav.takeover_amount) {
          // SAV partiellement pris en charge
          const totalCost = Number(sav.total_cost) || 1;
          const takeoverAmt = Number(sav.takeover_amount) || 0;
          const clientPaysRatio = Math.max(0, 1 - (takeoverAmt / totalCost));
          revenue = parts.totalSelling * clientPaysRatio;
          profit = revenue - parts.totalPurchase;
        } else {
          // SAV entièrement payé par le client
          revenue = parts.totalSelling;
          profit = revenue - parts.totalPurchase;
        }

        return {
          id: sav.id,
          type: 'sav',
          number: sav.case_number,
          date: sav.created_at,
          status: sav.status,
          total_cost: sav.total_cost,
          revenue,
          profit,
          description: sav.problem_description || '',
        } as CustomerActivity;
      });

      // Traiter les devis
      const quoteActivities: CustomerActivity[] = (quotesData || []).map((quote) => {
        let revenue = 0;
        let profit = 0;
        
        if (quote.status === 'accepted') {
          revenue = quote.total_amount;
          profit = revenue * 0.25; // Estimation 25% de marge sur les devis
        }

        return {
          id: quote.id,
          type: 'quote' as const,
          number: quote.quote_number,
          date: quote.created_at,
          status: quote.status,
          total_cost: quote.total_amount,
          revenue,
          profit,
          description: `Devis ${quote.customer_name}`,
        };
      });

      // Combiner toutes les activités
      const allActivities = [...savActivities, ...quoteActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculer les statistiques
      const newStats: CustomerStats = {
        total_revenue: allActivities.reduce((sum, activity) => sum + activity.revenue, 0),
        total_profit: allActivities.reduce((sum, activity) => sum + activity.profit, 0),
        total_sav: savActivities.length,
        total_quotes: quoteActivities.length,
        accepted_quotes: quoteActivities.filter(q => q.status === 'accepted').length,
      };

      setActivities(allActivities);
      setStats(newStats);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'activité du client",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerActivity();
    }
  }, [customerId]);

  return {
    activities,
    stats,
    loading,
    refetch: fetchCustomerActivity,
  };
}