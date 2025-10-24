import { createContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export const RealtimeContext = createContext({});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    console.log('🔔 Realtime: Initialisation des listeners globaux');

    const channel = supabase
      .channel('global-data-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sav_cases' },
        (payload: any) => {
          console.log('🔔 Realtime SAV change:', payload.eventType, payload.new?.id || payload.old?.id);
          
          // Ne pas refetch automatiquement - juste invalider le cache
          queryClient.invalidateQueries({ 
            queryKey: ['sav-cases'],
            refetchType: 'none'
          });
          
          // Refetch UNIQUEMENT si on est sur une page SAV ou Orders
          if (window.location.pathname.includes('/sav') || 
              window.location.pathname.includes('/orders')) {
            queryClient.refetchQueries({ queryKey: ['sav-cases'] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload: any) => {
          console.log('🔔 Realtime Customer change:', payload.eventType);
          
          queryClient.invalidateQueries({ 
            queryKey: ['customers'],
            refetchType: 'none'
          });
          
          if (window.location.pathname.includes('/customers')) {
            queryClient.refetchQueries({ queryKey: ['customers'] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parts' },
        (payload: any) => {
          console.log('🔔 Realtime Parts change:', payload.eventType);
          
          queryClient.invalidateQueries({ 
            queryKey: ['parts'],
            refetchType: 'none'
          });
          
          if (window.location.pathname.includes('/parts') || 
              window.location.pathname.includes('/orders')) {
            queryClient.refetchQueries({ queryKey: ['parts'] });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime status:', status);
      });

    return () => {
      console.log('🔔 Realtime: Nettoyage des listeners globaux');
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return <RealtimeContext.Provider value={{}}>{children}</RealtimeContext.Provider>;
}
