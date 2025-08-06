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

      // Récupérer les devis du client (simplifier pour l'instant)
      const quotesData: any[] = []; // Temporaire jusqu'à ce que la relation soit créée

      // Traiter les activités SAV
      const savActivities: CustomerActivity[] = (savData || []).map((sav) => {
        let revenue = 0;
        let profit = 0;
        
        if (sav.status === 'ready') {
          if (sav.taken_over) {
            // SAV totalement pris en charge par le magasin
            revenue = 0;
            profit = -sav.total_cost; // Coût pour le magasin
          } else if (sav.partial_takeover) {
            // SAV partiellement pris en charge
            revenue = sav.total_cost - (sav.takeover_amount || 0);
            profit = revenue * 0.3; // Estimation 30% de marge
          } else {
            // SAV entièrement payé par le client
            revenue = sav.total_cost;
            profit = revenue * 0.3; // Estimation 30% de marge
          }
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