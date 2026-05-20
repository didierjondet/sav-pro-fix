import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SAVNextAppointment {
  id: string;
  sav_case_id: string | null;
  customer_id: string | null;
  start_datetime: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
}

const ACTIVE_STATUSES = ['proposed', 'confirmed', 'counter_proposed'] as Array<'proposed' | 'confirmed' | 'counter_proposed'>;

export function useSAVAppointments(savCaseIds: string[], customerIds: string[] = []) {
  const savKey = useMemo(() => [...savCaseIds].sort().join(','), [savCaseIds]);
  const custKey = useMemo(() => [...customerIds].sort().join(','), [customerIds]);

  // Requête 1 : RDV rattachés à un SAV de la liste
  const { data: bySavData = [] } = useQuery({
    queryKey: ['sav-next-appointments', 'by-sav', savKey],
    queryFn: async (): Promise<SAVNextAppointment[]> => {
      if (savCaseIds.length === 0) return [];
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('appointments')
        .select('id, sav_case_id, customer_id, start_datetime, duration_minutes, appointment_type, status')
        .in('sav_case_id', savCaseIds)
        .in('status', ACTIVE_STATUSES as unknown as string[])
        .gte('start_datetime', nowIso)
        .order('start_datetime', { ascending: true });
      if (error) throw error;
      return (data || []) as SAVNextAppointment[];
    },
    enabled: savCaseIds.length > 0,
    staleTime: 60_000,
  });

  // Requête 2 : RDV non rattachés à un SAV mais liés à un client de la liste (fallback)
  const { data: byCustData = [] } = useQuery({
    queryKey: ['sav-next-appointments', 'by-customer', custKey],
    queryFn: async (): Promise<SAVNextAppointment[]> => {
      if (customerIds.length === 0) return [];
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('appointments')
        .select('id, sav_case_id, customer_id, start_datetime, duration_minutes, appointment_type, status')
        .in('customer_id', customerIds)
        .is('sav_case_id', null)
        .in('status', ACTIVE_STATUSES as unknown as string[])
        .gte('start_datetime', nowIso)
        .order('start_datetime', { ascending: true });
      if (error) throw error;
      return (data || []) as SAVNextAppointment[];
    },
    enabled: customerIds.length > 0,
    staleTime: 60_000,
  });

  const appointmentsByCase = useMemo(() => {
    const map = new Map<string, SAVNextAppointment>();
    for (const apt of bySavData) {
      if (apt.sav_case_id && !map.has(apt.sav_case_id)) {
        map.set(apt.sav_case_id, apt);
      }
    }
    return map;
  }, [bySavData]);

  const appointmentsByCustomer = useMemo(() => {
    const map = new Map<string, SAVNextAppointment>();
    for (const apt of byCustData) {
      if (apt.customer_id && !map.has(apt.customer_id)) {
        map.set(apt.customer_id, apt);
      }
    }
    return map;
  }, [byCustData]);

  return { appointmentsByCase, appointmentsByCustomer };
}
