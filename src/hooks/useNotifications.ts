import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: 'stock_alert' | 'order_needed' | 'general' | 'support_message';
  title: string;
  message: string;
  sav_case_id?: string;
  part_id?: string;
  support_ticket_id?: string;
  read: boolean;
  created_at: string;
  shop_id: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const notifs = (data as Notification[]) || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at' | 'shop_id' | 'read'>) => {
    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop non trouvé');
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          ...notification,
          shop_id: profile.shop_id,
          read: false
        }])
        .select()
        .single();

      if (error) throw error;

      fetchNotifications();
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating notification:', error);
      return { data: null, error };
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;
      fetchNotifications();
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const createStockAlert = async (partId: string, partName: string, savCaseId?: string) => {
    const title = 'Stock épuisé';
    const message = savCaseId 
      ? `La pièce "${partName}" est en rupture de stock pour le SAV ${savCaseId}`
      : `La pièce "${partName}" est en rupture de stock`;
    
    return await createNotification({
      type: 'stock_alert',
      title,
      message,
      part_id: partId,
      sav_case_id: savCaseId
    });
  };

  const createSupportMessageNotification = async (ticketId: string, subject: string, senderType: 'shop' | 'admin') => {
    const title = senderType === 'admin' ? 'Nouveau message du support' : 'Nouvelle réponse client';
    const message = `Nouveau message dans le ticket: ${subject}`;
    
    // Play notification sound
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Fallback to system notification sound
        console.log('🔔 Support notification');
      });
    } catch (error) {
      console.log('🔔 Support notification');
    }
    
    return await createNotification({
      type: 'support_message',
      title,
      message,
      support_ticket_id: ticketId
    });
  };

  return {
    notifications,
    loading,
    unreadCount,
    createNotification,
    createStockAlert,
    createSupportMessageNotification,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}