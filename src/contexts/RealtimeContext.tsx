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

    console.log('🔔 Realtime: DÉSACTIVÉ temporairement (performance)');
    
    // DÉSACTIVATION TEMPORAIRE DES SUBSCRIPTIONS REALTIME
    // Cause: 63% du CPU utilisé par realtime.list_changes (38M appels)
    // Solution: Désactiver et utiliser polling manuel à la place
    
    return () => {
      console.log('🔔 Realtime: Cleanup');
    };
  }, [user, queryClient]);

  return <RealtimeContext.Provider value={{}}>{children}</RealtimeContext.Provider>;
}
