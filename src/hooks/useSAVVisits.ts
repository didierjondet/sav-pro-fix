import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SAVVisitCount {
  sav_case_id: string;
  visit_count: number;
}

export function useSAVVisits(savCaseIds: string[]) {
  const [visits, setVisits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchVisitCounts = useCallback(async () => {
    if (savCaseIds.length === 0) {
      setVisits({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_sav_visit_counts', {
        p_sav_case_ids: savCaseIds
      });

      if (error) {
        console.error('Error fetching SAV visit counts via RPC:', error);
        return;
      }

      const countsMap: Record<string, number> = {};
      if (data) {
        (data as any[]).forEach((row: { sav_case_id: string; visit_count: number }) => {
          countsMap[row.sav_case_id] = Number(row.visit_count);
        });
      }

      setVisits(countsMap);
    } catch (error: any) {
      console.error('Error fetching SAV visits:', error);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(savCaseIds)]);

  useEffect(() => {
    fetchVisitCounts();
  }, [fetchVisitCounts]);

  const getVisitCount = useCallback((savCaseId: string): number => {
    return visits[savCaseId] ?? 0;
  }, [visits]);

  return {
    visits,
    loading,
    getVisitCount,
    refetch: fetchVisitCounts
  };
}
