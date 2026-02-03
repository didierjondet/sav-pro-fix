import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useToast } from './use-toast';

export interface BlockedSlot {
  id: string;
  shop_id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
  technician_id: string | null;
  created_at: string;
  updated_at: string;
  technician?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface CreateBlockedSlotData {
  start_datetime: string;
  end_datetime: string;
  reason?: string;
  technician_id?: string;
}

export function useBlockedSlots(startDate?: Date, endDate?: Date) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blockedSlots = [], isLoading, refetch } = useQuery({
    queryKey: ['blocked-slots', profile?.shop_id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!profile?.shop_id) return [];
      
      let query = supabase
        .from('shop_blocked_slots')
        .select(`
          *,
          technician:profiles(id, first_name, last_name)
        `)
        .eq('shop_id', profile.shop_id)
        .order('start_datetime', { ascending: true });

      if (startDate) {
        query = query.gte('start_datetime', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('end_datetime', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as BlockedSlot[];
    },
    enabled: !!profile?.shop_id,
  });

  const createBlockedSlotMutation = useMutation({
    mutationFn: async (slotData: CreateBlockedSlotData) => {
      if (!profile?.shop_id) throw new Error('Shop ID non trouvé');

      const { data, error } = await supabase
        .from('shop_blocked_slots')
        .insert({
          shop_id: profile.shop_id,
          ...slotData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-slots'] });
      toast({
        title: 'Créneau bloqué',
        description: 'Le créneau a été bloqué avec succès',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de bloquer le créneau',
        variant: 'destructive',
      });
    },
  });

  const deleteBlockedSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shop_blocked_slots')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-slots'] });
      toast({
        title: 'Créneau débloqué',
        description: 'Le créneau est à nouveau disponible',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de débloquer le créneau',
        variant: 'destructive',
      });
    },
  });

  // Check if a time slot is blocked
  const isSlotBlocked = (datetime: Date, duration: number = 30): boolean => {
    const endTime = new Date(datetime.getTime() + duration * 60000);
    
    return blockedSlots.some(slot => {
      const slotStart = new Date(slot.start_datetime);
      const slotEnd = new Date(slot.end_datetime);
      
      // Check if there's any overlap
      return datetime < slotEnd && endTime > slotStart;
    });
  };

  return {
    blockedSlots,
    loading: isLoading,
    refetch,
    createBlockedSlot: createBlockedSlotMutation.mutateAsync,
    deleteBlockedSlot: deleteBlockedSlotMutation.mutateAsync,
    isSlotBlocked,
    isCreating: createBlockedSlotMutation.isPending,
    isDeleting: deleteBlockedSlotMutation.isPending,
  };
}
