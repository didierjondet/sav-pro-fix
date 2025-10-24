import { useSAVDelayNotifications } from '@/hooks/useSAVDelayNotifications';
import { useAuth } from '@/contexts/AuthContext';

export function DelayNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // DÉSACTIVÉ TEMPORAIREMENT - Cause 220K requêtes/jour sur notifications
  // Les alertes de retard sont maintenant gérées par un edge function CRON
  // if (user) {
  //   useSAVDelayNotifications();
  // }
  
  return <>{children}</>;
}