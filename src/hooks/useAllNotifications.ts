import { useMemo } from 'react';
import { useNotifications, Notification } from './useNotifications';
import { useSAVUnreadMessages, SAVWithUnreadMessages } from './useSAVUnreadMessages';

export interface UnifiedNotification {
  id: string;
  type: 'notification' | 'sav_message';
  title: string;
  message: string;
  icon: string;
  created_at: string;
  read: boolean;
  savCaseId?: string;
  supportTicketId?: string;
  partId?: string;
  notificationType?: string;
  unreadCount?: number;
  savData?: SAVWithUnreadMessages;
}

/**
 * Hook unifié qui combine les notifications classiques et les messages SAV non lus
 * Simplifie la gestion des notifications dans l'application
 */
export function useAllNotifications() {
  const { 
    notifications, 
    unreadCount: notificationUnreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    createStockAlert,
    createSupportMessageNotification,
    createSAVMessageNotification,
    createSAVDelayAlert,
    loading: notificationsLoading,
    refetch: refetchNotifications
  } = useNotifications();

  const { 
    savWithUnreadMessages,
    loading: savLoading,
    refetch: refetchSAVMessages,
    handleSAVClosed
  } = useSAVUnreadMessages();

  // Convertir les notifications classiques en format unifié
  const unifiedNotifications = useMemo(() => {
    const classicNotifs: UnifiedNotification[] = notifications.map(notif => ({
      id: notif.id,
      type: 'notification' as const,
      title: notif.title,
      message: notif.message,
      icon: getNotificationIcon(notif.type),
      created_at: notif.created_at,
      read: notif.read,
      savCaseId: notif.sav_case_id,
      supportTicketId: notif.support_ticket_id,
      partId: notif.part_id,
      notificationType: notif.type,
    }));

    // Convertir les messages SAV en format unifié
    const savNotifs: UnifiedNotification[] = savWithUnreadMessages.map(sav => ({
      id: `sav-${sav.id}`,
      type: 'sav_message' as const,
      title: getDisplayName(sav),
      message: `${sav.unread_count} nouveau${sav.unread_count > 1 ? 'x' : ''} message${sav.unread_count > 1 ? 's' : ''}`,
      icon: '🔧',
      created_at: new Date().toISOString(), // On n'a pas de date précise, on met "maintenant"
      read: false,
      savCaseId: sav.id,
      unreadCount: sav.unread_count,
      savData: sav,
    }));

    // Combiner et trier par date (les plus récentes en premier)
    return [...savNotifs, ...classicNotifs].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications, savWithUnreadMessages]);

  // Calculer le nombre total de notifications non lues
  const totalUnreadCount = useMemo(() => {
    const savUnreadCount = savWithUnreadMessages.reduce((total, sav) => total + sav.unread_count, 0);
    return notificationUnreadCount + savUnreadCount;
  }, [notificationUnreadCount, savWithUnreadMessages]);

  const loading = notificationsLoading || savLoading;

  // Fonction pour rafraîchir toutes les notifications
  const refetchAll = () => {
    refetchNotifications();
    refetchSAVMessages();
  };

  return {
    notifications: unifiedNotifications,
    totalUnreadCount,
    notificationUnreadCount,
    savWithUnreadMessages,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    createStockAlert,
    createSupportMessageNotification,
    createSAVMessageNotification,
    createSAVDelayAlert,
    refetchAll,
    refetchNotifications,
    refetchSAVMessages,
    handleSAVClosed,
  };
}

// Fonction utilitaire pour obtenir l'icône de notification
function getNotificationIcon(type: string): string {
  switch (type) {
    case 'stock_alert': return '📦';
    case 'order_needed': return '🛒';  
    case 'support_message': return '💬';
    case 'sav_message': return '🔧';
    case 'sav_delay_alert': return '⏰';
    default: return '🔔';
  }
}

// Fonction utilitaire pour obtenir le nom d'affichage d'un SAV
function getDisplayName(sav: SAVWithUnreadMessages): string {
  if (sav.customer?.first_name && sav.customer?.last_name) {
    return `${sav.customer.first_name} ${sav.customer.last_name} - Message SAV`;
  }
  
  if (sav.sav_type === 'internal' && sav.device_brand && sav.device_model) {
    return `${sav.device_brand} ${sav.device_model} - SAV ${sav.case_number}`;
  }
  
  return `SAV ${sav.case_number} - Nouveau message`;
}
