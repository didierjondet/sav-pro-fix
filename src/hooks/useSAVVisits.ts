import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SAVVisitCount {
  sav_case_id: string;
  visit_count: number;
}

export function useSAVVisits(savCaseIds: string[]) {
  const [visits, setVisits] = useState<SAVVisitCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisitCounts = useCallback(async () => {
    if (savCaseIds.length === 0) {
      setVisits([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sav_tracking_visits')
        .select('sav_case_id')
        .in('sav_case_id', savCaseIds);

      if (error) throw error;

      const visitCounts: { [key: string]: number } = {};
      data?.forEach(visit => {
        visitCounts[visit.sav_case_id] = (visitCounts[visit.sav_case_id] || 0) + 1;
      });

      const result = savCaseIds.map(id => ({
        sav_case_id: id,
        visit_count: visitCounts[id] || 0
      }));

      setVisits(result);
    } catch (error: any) {
      console.error('Error fetching SAV visits:', error);
      const result = savCaseIds.map(id => ({
        sav_case_id: id,
        visit_count: 0
      }));
      setVisits(result);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(savCaseIds)]);

  useEffect(() => {
    fetchVisitCounts();
  }, [fetchVisitCounts]);

  const getVisitCount = useCallback((savCaseId: string): number => {
    const visit = visits.find(v => v.sav_case_id === savCaseId);
    return visit?.visit_count || 0;
  }, [visits]);

  return {
    visits,
    loading,
    getVisitCount,
    refetch: fetchVisitCounts
  };
}