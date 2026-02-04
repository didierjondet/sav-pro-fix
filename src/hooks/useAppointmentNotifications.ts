import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useToast } from './use-toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to listen for appointment changes and create notifications
 * Listens for: confirmed appointments, counter-proposals
 */
export function useAppointmentNotifications() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile?.shop_id) return;

    const channel = supabase
      .channel('appointment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `shop_id=eq.${profile.shop_id}`,
        },
        async (payload) => {
          const newAppointment = payload.new as any;
          const oldAppointment = payload.old as any;

          // Check if status changed to confirmed (client accepted)
          if (oldAppointment.status !== 'confirmed' && newAppointment.status === 'confirmed') {
            await createAppointmentNotification(
              profile.shop_id!,
              newAppointment.id,
              'appointment_confirmed',
              'RDV confirmé par le client',
              `Un client a confirmé son rendez-vous`
            );
            
            // Show toast in real-time
            toast({
              title: '✅ RDV confirmé',
              description: 'Un client a confirmé son rendez-vous',
            });
          }

          // Check if status changed to counter_proposed
          if (oldAppointment.status !== 'counter_proposed' && newAppointment.status === 'counter_proposed') {
            await createAppointmentNotification(
              profile.shop_id!,
              newAppointment.id,
              'appointment_counter_proposed',
              'Nouvelle contre-proposition',
              `Un client a proposé une nouvelle date pour son rendez-vous`
            );
            
            // Show toast in real-time
            toast({
              title: '🔄 Contre-proposition reçue',
              description: 'Un client a proposé une nouvelle date',
            });
          }

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['pending-appointments'] });
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.shop_id, toast, queryClient]);
}

async function createAppointmentNotification(
  shopId: string,
  appointmentId: string,
  type: string,
  title: string,
  message: string
) {
  try {
    // Check if notification already exists for this appointment update
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('shop_id', shopId)
      .eq('type', type)
      .ilike('message', `%${appointmentId.slice(0, 8)}%`)
      .eq('read', false)
      .maybeSingle();

    if (existing) return;

    await supabase.from('notifications').insert({
      shop_id: shopId,
      type: 'general',
      title,
      message: `${message} (ID: ${appointmentId.slice(0, 8)})`,
      read: false,
    });
  } catch (error) {
    console.error('Error creating appointment notification:', error);
  }
}
