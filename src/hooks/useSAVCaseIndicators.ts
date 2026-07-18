import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Number of unread client messages for a given SAV case (from shop side). */
export function useSAVCaseUnreadCount(savCaseId?: string) {
  return useQuery({
    queryKey: ['sav-case-unread', savCaseId],
    enabled: !!savCaseId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { count } = await supabase
        .from('sav_messages')
        .select('id', { count: 'exact', head: true })
        .eq('sav_case_id', savCaseId!)
        .eq('sender_type', 'client')
        .eq('read_by_shop', false);
      return count || 0;
    },
  });
}

/** Whether an active (non-returned) loaner loan exists for this SAV. */
export function useSAVCaseHasActiveLoan(savCaseId?: string) {
  return useQuery({
    queryKey: ['sav-case-active-loan', savCaseId],
    enabled: !!savCaseId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from('loaner_loans' as any)
        .select('id', { count: 'exact', head: true })
        .eq('sav_case_id', savCaseId!)
        .is('returned_at', null);
      return (count || 0) > 0;
    },
  });
}
