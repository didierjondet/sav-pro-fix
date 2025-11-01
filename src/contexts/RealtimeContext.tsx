import { createContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export const RealtimeContext = createContext({});

/**
 * RealtimeProvider - Gestion globale du Realtime Supabase
 * 
 * ⚠️ REALTIME DÉSACTIVÉ GLOBALEMENT pour performance
 * 
 * Cause : 63% du CPU utilisé par realtime.list_changes (38M appels)
 * Solution : Désactiver le realtime global et utiliser du polling manuel
 * 
 * EXCEPTION : Les notifications utilisent toujours le realtime car :
 * 1. Volume de données très faible (quelques notifications par jour)
 * 2. Besoin d'instantanéité critique pour l'UX
 * 3. Pas de risque de surcharge CPU
 * 
 * Voir src/hooks/useNotifications.ts pour l'implémentation du realtime des notifications
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    console.log('🔔 Realtime Global: DÉSACTIVÉ (performance)');
    console.log('📨 Realtime Notifications: ACTIVÉ (voir useNotifications.ts)');
    
    return () => {
      console.log('🔔 Realtime: Cleanup');
    };
  }, [user, queryClient]);

  return <RealtimeContext.Provider value={{}}>{children}</RealtimeContext.Provider>;
}
