import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useToast } from './use-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export type AppointmentStatus = 'proposed' | 'confirmed' | 'counter_proposed' | 'cancelled' | 'completed' | 'no_show';
export type AppointmentType = 'deposit' | 'pickup' | 'diagnostic' | 'repair';

export interface Appointment {
  id: string;
  shop_id: string;
  sav_case_id: string | null;
  customer_id: string | null;
  technician_id: string | null;
  start_datetime: string;
  duration_minutes: number;
  status: AppointmentStatus;
  appointment_type: AppointmentType;
  notes: string | null;
  device_info: Record<string, any>;
  proposed_by: 'shop' | 'client';
  confirmation_token: string;
  counter_proposal_datetime: string | null;
  counter_proposal_message: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  };
  sav_case?: {
    id: string;
    case_number: string;
    device_brand: string | null;
    device_model: string | null;
  };
  technician?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface CreateAppointmentData {
  sav_case_id?: string;
  customer_id?: string;
  technician_id?: string;
  start_datetime: string;
  duration_minutes: number;
  status?: AppointmentStatus;
  appointment_type: AppointmentType;
  notes?: string;
  device_info?: Record<string, any>;
  proposed_by?: 'shop' | 'client';
}

export interface UpdateAppointmentData {
  start_datetime?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  appointment_type?: AppointmentType;
  notes?: string;
  technician_id?: string;
  counter_proposal_datetime?: string;
  counter_proposal_message?: string;
}

type ViewType = 'day' | 'week' | 'month';

export function useAppointments(viewType: ViewType = 'week', date: Date = new Date()) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate date range based on view
  const getDateRange = () => {
    switch (viewType) {
      case 'day':
        return { start: startOfDay(date), end: endOfDay(date) };
      case 'week':
        return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(date), end: endOfMonth(date) };
      default:
        return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    }
  };

  const { start, end } = getDateRange();

  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['appointments', profile?.shop_id, viewType, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!profile?.shop_id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, first_name, last_name, phone, email),
          sav_case:sav_cases(id, case_number, device_brand, device_model),
          technician:profiles(id, first_name, last_name)
        `)
        .eq('shop_id', profile.shop_id)
        .gte('start_datetime', start.toISOString())
        .lte('start_datetime', end.toISOString())
        .order('start_datetime', { ascending: true });

      if (error) throw error;
      return data as unknown as Appointment[];
    },
    enabled: !!profile?.shop_id,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: CreateAppointmentData) => {
      if (!profile?.shop_id) throw new Error('Shop ID non trouvé');

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          shop_id: profile.shop_id,
          ...appointmentData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Rendez-vous créé',
        description: 'Le rendez-vous a été ajouté à l\'agenda',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le rendez-vous',
        variant: 'destructive',
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAppointmentData }) => {
      const { data: updated, error } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Rendez-vous modifié',
        description: 'Les modifications ont été enregistrées',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le rendez-vous',
        variant: 'destructive',
      });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Rendez-vous supprimé',
        description: 'Le rendez-vous a été retiré de l\'agenda',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le rendez-vous',
        variant: 'destructive',
      });
    },
  });

  const confirmAppointment = async (id: string) => {
    return updateAppointmentMutation.mutateAsync({
      id,
      data: { status: 'confirmed' },
    });
  };

  const cancelAppointment = async (id: string) => {
    return updateAppointmentMutation.mutateAsync({
      id,
      data: { status: 'cancelled' },
    });
  };

  const completeAppointment = async (id: string) => {
    return updateAppointmentMutation.mutateAsync({
      id,
      data: { status: 'completed' },
    });
  };

  const markNoShow = async (id: string) => {
    return updateAppointmentMutation.mutateAsync({
      id,
      data: { status: 'no_show' },
    });
  };

  return {
    appointments,
    loading: isLoading,
    refetch,
    createAppointment: createAppointmentMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    confirmAppointment,
    cancelAppointment,
    completeAppointment,
    markNoShow,
    isCreating: createAppointmentMutation.isPending,
    isUpdating: updateAppointmentMutation.isPending,
    isDeleting: deleteAppointmentMutation.isPending,
  };
}

// Hook pour récupérer un RDV par token (accès public)
export function useAppointmentByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['appointment-by-token', token],
    queryFn: async () => {
      if (!token) return null;
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, first_name, last_name, phone, email),
          sav_case:sav_cases(id, case_number, device_brand, device_model)
        `)
        .eq('confirmation_token', token)
        .single();

      if (error) throw error;
      return data as unknown as Appointment;
    },
    enabled: !!token,
  });
}

// Hook pour compter les RDV du jour
export function useTodayAppointmentsCount() {
  const { profile } = useProfile();
  
  return useQuery({
    queryKey: ['today-appointments-count', profile?.shop_id],
    queryFn: async () => {
      if (!profile?.shop_id) return 0;
      
      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);

      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', profile.shop_id)
        .gte('start_datetime', start.toISOString())
        .lte('start_datetime', end.toISOString())
        .not('status', 'in', '("cancelled","completed","no_show")');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.shop_id,
  });
}
