import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useToast } from './use-toast';

export interface WorkingHours {
  id: string;
  shop_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  start_time: string;
  end_time: string;
  is_open: boolean;
  break_start: string | null;
  break_end: string | null;
}

const DEFAULT_WORKING_HOURS: Omit<WorkingHours, 'id' | 'shop_id'>[] = [
  { day_of_week: 0, start_time: '09:00', end_time: '18:00', is_open: false, break_start: null, break_end: null }, // Sunday
  { day_of_week: 1, start_time: '09:00', end_time: '18:00', is_open: true, break_start: '12:00', break_end: '14:00' }, // Monday
  { day_of_week: 2, start_time: '09:00', end_time: '18:00', is_open: true, break_start: '12:00', break_end: '14:00' }, // Tuesday
  { day_of_week: 3, start_time: '09:00', end_time: '18:00', is_open: true, break_start: '12:00', break_end: '14:00' }, // Wednesday
  { day_of_week: 4, start_time: '09:00', end_time: '18:00', is_open: true, break_start: '12:00', break_end: '14:00' }, // Thursday
  { day_of_week: 5, start_time: '09:00', end_time: '18:00', is_open: true, break_start: '12:00', break_end: '14:00' }, // Friday
  { day_of_week: 6, start_time: '09:00', end_time: '13:00', is_open: true, break_start: null, break_end: null }, // Saturday
];

export const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function useWorkingHours() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workingHours, isLoading, refetch } = useQuery({
    queryKey: ['working-hours', profile?.shop_id],
    queryFn: async () => {
      if (!profile?.shop_id) return [];
      
      const { data, error } = await supabase
        .from('shop_working_hours')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return data as WorkingHours[];
    },
    enabled: !!profile?.shop_id,
  });

  const initializeWorkingHoursMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.shop_id) throw new Error('Shop ID non trouvé');

      const hoursToInsert = DEFAULT_WORKING_HOURS.map(h => ({
        ...h,
        shop_id: profile.shop_id,
      }));

      const { data, error } = await supabase
        .from('shop_working_hours')
        .insert(hoursToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      toast({
        title: 'Horaires initialisés',
        description: 'Les horaires par défaut ont été créés',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'initialiser les horaires',
        variant: 'destructive',
      });
    },
  });

  const updateWorkingHoursMutation = useMutation({
    mutationFn: async (hours: Partial<WorkingHours> & { id: string }) => {
      const { id, ...updateData } = hours;
      
      const { data, error } = await supabase
        .from('shop_working_hours')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours'] });
      toast({
        title: 'Horaires modifiés',
        description: 'Les modifications ont été enregistrées',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier les horaires',
        variant: 'destructive',
      });
    },
  });

  // Get working hours for a specific day
  const getWorkingHoursForDay = (dayOfWeek: number) => {
    return workingHours?.find(h => h.day_of_week === dayOfWeek);
  };

  // Check if shop is open at a specific time
  const isOpenAt = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    const hours = getWorkingHoursForDay(dayOfWeek);
    
    if (!hours || !hours.is_open) return false;

    const timeStr = date.toTimeString().slice(0, 5);
    
    // Check if within working hours
    if (timeStr < hours.start_time || timeStr >= hours.end_time) return false;
    
    // Check if in break
    if (hours.break_start && hours.break_end) {
      if (timeStr >= hours.break_start && timeStr < hours.break_end) return false;
    }
    
    return true;
  };

  // Get available time slots for a day
  const getAvailableSlots = (date: Date, slotDuration: number = 30): string[] => {
    const dayOfWeek = date.getDay();
    const hours = getWorkingHoursForDay(dayOfWeek);
    
    if (!hours || !hours.is_open) return [];
    
    const slots: string[] = [];
    const [startHour, startMin] = hours.start_time.split(':').map(Number);
    const [endHour, endMin] = hours.end_time.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    while (currentMinutes + slotDuration <= endMinutes) {
      const timeStr = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      
      // Skip if in break
      if (hours.break_start && hours.break_end) {
        const [breakStartH, breakStartM] = hours.break_start.split(':').map(Number);
        const [breakEndH, breakEndM] = hours.break_end.split(':').map(Number);
        const breakStart = breakStartH * 60 + breakStartM;
        const breakEnd = breakEndH * 60 + breakEndM;
        
        if (currentMinutes >= breakStart && currentMinutes < breakEnd) {
          currentMinutes = breakEnd;
          continue;
        }
      }
      
      slots.push(timeStr);
      currentMinutes += slotDuration;
    }
    
    return slots;
  };

  return {
    workingHours: workingHours || [],
    loading: isLoading,
    refetch,
    initializeWorkingHours: initializeWorkingHoursMutation.mutateAsync,
    updateWorkingHours: updateWorkingHoursMutation.mutateAsync,
    getWorkingHoursForDay,
    isOpenAt,
    getAvailableSlots,
    hasWorkingHours: (workingHours?.length || 0) > 0,
    isInitializing: initializeWorkingHoursMutation.isPending,
    isUpdating: updateWorkingHoursMutation.isPending,
  };
}
