import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SAVVisitCount {
  sav_case_id: string;
  visit_count: number;
}

export function useSAVVisits(savCaseIds: string[]) {
  const [visits, setVisits] = useState<SAVVisitCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (savCaseIds.length > 0) {
      fetchVisitCounts();
    } else {
      setVisits([]);
      setLoading(false);
    }
  }, [savCaseIds]);

  const fetchVisitCounts = async () => {
    try {
      setLoading(true);
      
      // Récupérer le nombre de visites pour chaque SAV
      const { data, error } = await supabase
        .from('sav_tracking_visits')
        .select('sav_case_id')
        .in('sav_case_id', savCaseIds);

      if (error) throw error;

      // Compter les visites par SAV case
      const visitCounts: { [key: string]: number } = {};
      data?.forEach(visit => {
        visitCounts[visit.sav_case_id] = (visitCounts[visit.sav_case_id] || 0) + 1;
      });

      // Transformer en tableau avec 0 pour les SAV sans visite
      const result = savCaseIds.map(id => ({
        sav_case_id: id,
        visit_count: visitCounts[id] || 0
      }));

      setVisits(result);
    } catch (error: any) {
      console.error('Error fetching SAV visits:', error);
      // En cas d'erreur, initialiser à 0 pour tous les SAV
      const result = savCaseIds.map(id => ({
        sav_case_id: id,
        visit_count: 0
      }));
      setVisits(result);
    } finally {
      setLoading(false);
    }
  };

  const getVisitCount = (savCaseId: string): number => {
    const visit = visits.find(v => v.sav_case_id === savCaseId);
    return visit?.visit_count || 0;
  };

  return {
    visits,
    loading,
    getVisitCount,
    refetch: fetchVisitCounts
  };
}