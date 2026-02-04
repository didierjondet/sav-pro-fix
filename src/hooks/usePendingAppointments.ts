import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useToast } from './use-toast';
import { Appointment } from './useAppointments';

/**
 * Hook to manage pending appointments (counter-proposals from clients and client confirmations)
 */
export function usePendingAppointments() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch appointments with counter-proposals or pending confirmations
  const { data: pendingAppointments = [], isLoading } = useQuery({
    queryKey: ['pending-appointments', profile?.shop_id],
    queryFn: async () => {
      if (!profile?.shop_id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, first_name, last_name, phone, email),
          sav_case:sav_cases(id, case_number, device_brand, device_model)
        `)
        .eq('shop_id', profile.shop_id)
        .eq('status', 'counter_proposed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Appointment[];
    },
    enabled: !!profile?.shop_id,
  });

  // Accept client's counter-proposal
  const acceptCounterProposalMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const appointment = pendingAppointments.find(a => a.id === appointmentId);
      if (!appointment?.counter_proposal_datetime) {
        throw new Error('Pas de contre-proposition à accepter');
      }

      const { data, error } = await supabase
        .from('appointments')
        .update({
          start_datetime: appointment.counter_proposal_datetime,
          status: 'confirmed',
          counter_proposal_datetime: null,
          counter_proposal_message: null,
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Contre-proposition acceptée',
        description: 'Le rendez-vous a été confirmé avec la nouvelle date',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'accepter la contre-proposition',
        variant: 'destructive',
      });
    },
  });

  // Reject client's counter-proposal
  const rejectCounterProposalMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          counter_proposal_datetime: null,
          counter_proposal_message: null,
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Contre-proposition refusée',
        description: 'Le rendez-vous a été annulé',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de refuser la contre-proposition',
        variant: 'destructive',
      });
    },
  });

  return {
    pendingAppointments,
    pendingCount: pendingAppointments.length,
    loading: isLoading,
    acceptCounterProposal: acceptCounterProposalMutation.mutateAsync,
    rejectCounterProposal: rejectCounterProposalMutation.mutateAsync,
    isAccepting: acceptCounterProposalMutation.isPending,
    isRejecting: rejectCounterProposalMutation.isPending,
  };
}
