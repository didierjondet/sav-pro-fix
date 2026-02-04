import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useToast } from './use-toast';
import { Appointment } from './useAppointments';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
          sav_case:sav_cases(id, case_number, device_brand, device_model, tracking_slug)
        `)
        .eq('shop_id', profile.shop_id)
        .eq('status', 'counter_proposed')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Appointment[];
    },
    enabled: !!profile?.shop_id,
  });

  // Helper to send notification (SMS or Chat)
  const sendNotification = async (
    appointment: Appointment,
    type: 'accepted' | 'rejected',
    notifyMethod: 'sms' | 'chat' | null
  ) => {
    if (!notifyMethod || !appointment.customer) return;

    const customerName = `${appointment.customer.first_name} ${appointment.customer.last_name}`;
    const appointmentDate = appointment.counter_proposal_datetime || appointment.start_datetime;
    const formattedDate = format(new Date(appointmentDate), "EEEE d MMMM 'à' HH'h'mm", { locale: fr });

    if (notifyMethod === 'sms' && appointment.customer.phone) {
      // Send SMS
      const message = type === 'accepted'
        ? `Bonjour ${customerName}, votre proposition de RDV du ${formattedDate} a été confirmée ! À bientôt.`
        : `Bonjour ${customerName}, nous n'avons pas pu retenir votre proposition de RDV. Contactez-nous pour convenir d'un autre horaire.`;

      await supabase.functions.invoke('send-sms', {
        body: {
          shopId: profile?.shop_id,
          toNumber: appointment.customer.phone,
          message,
          type: 'appointment_proposal',
          recordId: appointment.id,
        },
      });
    } else if (notifyMethod === 'chat' && appointment.sav_case_id) {
      // Send chat message
      const message = type === 'accepted'
        ? `✅ Votre proposition de RDV pour le ${formattedDate} a été acceptée ! À bientôt.`
        : `❌ Nous n'avons pas pu retenir votre proposition de RDV. Contactez-nous pour convenir d'un autre horaire.`;

      const { data: savCase } = await supabase
        .from('sav_cases')
        .select('shop_id')
        .eq('id', appointment.sav_case_id)
        .single();

      if (savCase) {
        await supabase.from('sav_messages').insert({
          sav_case_id: appointment.sav_case_id,
          sender_type: 'shop',
          sender_name: 'Système',
          message,
          shop_id: savCase.shop_id,
          read_by_shop: true,
          read_by_client: false,
        });
      }
    }
  };

  // Accept client's counter-proposal
  const acceptCounterProposalMutation = useMutation({
    mutationFn: async ({ appointmentId, notifyMethod }: { appointmentId: string; notifyMethod: 'sms' | 'chat' | null }) => {
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

      // Send notification if requested
      await sendNotification(appointment, 'accepted', notifyMethod);

      return data;
    },
    onSuccess: (_, { notifyMethod }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Contre-proposition acceptée',
        description: notifyMethod 
          ? `Le RDV a été confirmé et le client a été notifié par ${notifyMethod === 'sms' ? 'SMS' : 'chat'}`
          : 'Le rendez-vous a été confirmé avec la nouvelle date',
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
    mutationFn: async ({ appointmentId, notifyMethod }: { appointmentId: string; notifyMethod: 'sms' | 'chat' | null }) => {
      const appointment = pendingAppointments.find(a => a.id === appointmentId);
      
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

      // Send notification if requested
      if (appointment) {
        await sendNotification(appointment, 'rejected', notifyMethod);
      }

      return data;
    },
    onSuccess: (_, { notifyMethod }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Contre-proposition refusée',
        description: notifyMethod 
          ? `Le RDV a été annulé et le client a été notifié par ${notifyMethod === 'sms' ? 'SMS' : 'chat'}`
          : 'Le rendez-vous a été annulé',
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
    acceptCounterProposal: (appointmentId: string, notifyMethod: 'sms' | 'chat' | null = null) => 
      acceptCounterProposalMutation.mutateAsync({ appointmentId, notifyMethod }),
    rejectCounterProposal: (appointmentId: string, notifyMethod: 'sms' | 'chat' | null = null) => 
      rejectCounterProposalMutation.mutateAsync({ appointmentId, notifyMethod }),
    isAccepting: acceptCounterProposalMutation.isPending,
    isRejecting: rejectCounterProposalMutation.isPending,
  };
}
