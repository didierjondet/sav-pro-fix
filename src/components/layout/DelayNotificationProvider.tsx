import { useSAVDelayNotifications } from '@/hooks/useSAVDelayNotifications';
import { useAuth } from '@/contexts/AuthContext';

export function DelayNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Activer les notifications de retard seulement si l'utilisateur est connecté
  if (user) {
    useSAVDelayNotifications();
  }
  
  return <>{children}</>;
}