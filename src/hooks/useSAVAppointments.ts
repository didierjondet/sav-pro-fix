import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SAVNextAppointment {
  id: string;
  sav_case_id: string;
  start_datetime: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
}

const ACTIVE_STATUSES = ['proposed', 'confirmed', 'counter_proposed'];

export function useSAVAppointments(savCaseIds: string[]) {
  const idsKey = useMemo(() => [...savCaseIds].sort().join(','), [savCaseIds]);

  const { data = [] } = useQuery({
    queryKey: ['sav-next-appointments', idsKey],
    queryFn: async (): Promise<SAVNextAppointment[]> => {
      if (savCaseIds.length === 0) return [];
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('appointments')
        .select('id, sav_case_id, start_datetime, duration_minutes, appointment_type, status')
        .in('sav_case_id', savCaseIds)
        .in('status', ACTIVE_STATUSES)
        .gte('start_datetime', nowIso)
        .order('start_datetime', { ascending: true });
      if (error) throw error;
      return (data || []) as SAVNextAppointment[];
    },
    enabled: savCaseIds.length > 0,
    staleTime: 60_000,
  });

  const appointmentsByCase = useMemo(() => {
    const map = new Map<string, SAVNextAppointment>();
    for (const apt of data) {
      if (apt.sav_case_id && !map.has(apt.sav_case_id)) {
        map.set(apt.sav_case_id, apt);
      }
    }
    return map;
  }, [data]);

  return { appointmentsByCase };
}
