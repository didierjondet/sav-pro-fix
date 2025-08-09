import { useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { useSAVUnreadMessages } from '@/hooks/useSAVUnreadMessages';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { savWithUnreadMessages } = useSAVUnreadMessages();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Listen to real-time changes
  useEffect(() => {
    if (!user) return;

    let savChannel: any;
    let supportChannel: any;

    const setupRealtimeListeners = async () => {
      // Get user's shop_id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile?.shop_id) return;

      // Listen to SAV messages
      savChannel = supabase
        .channel('sav-messages-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sav_messages',
            filter: `shop_id=eq.${profile.shop_id}`
          },
          (payload) => {
            console.log('New SAV message:', payload);
            if (payload.new.sender_type === 'client') {
              triggerNotificationEffect();
            }
          }
        )
        .subscribe();

      // Get shop ticket IDs for support messages
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('shop_id', profile.shop_id);
      
      if (tickets && tickets.length > 0) {
        const ticketIds = tickets.map(t => t.id);
        
        // Listen to support messages
        supportChannel = supabase
          .channel('support-messages-realtime')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'support_messages'
            },
            (payload) => {
              console.log('New support message:', payload);
              // Only trigger if it's from admin and for this shop's tickets
              if (payload.new.sender_type === 'admin' && ticketIds.includes(payload.new.ticket_id)) {
                triggerNotificationEffect();
              }
            }
          )
          .subscribe();
      }
    };

    setupRealtimeListeners();

    return () => {
      if (savChannel) supabase.removeChannel(savChannel);
      if (supportChannel) supabase.removeChannel(supportChannel);
    };
  }, [user]);

  const triggerNotificationEffect = () => {
    setHasNewActivity(true);
    setIsAnimating(true);
    
    // Play notification sound
    const audio = new Audio('/notification.mp3');
    audio.play().catch(console.error);
    
    // Stop animation after shaking
    setTimeout(() => setIsAnimating(false), 1500);
  };

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    if (hasNewActivity) {
      setHasNewActivity(false);
    }
  };

  const handleSAVClick = async (savCaseId: string) => {
    try {
      // Marquer tous les messages non lus de ce SAV comme lus par le shop
      await supabase
        .from('sav_messages')
        .update({ read_by_shop: true })
        .eq('sav_case_id', savCaseId)
        .eq('sender_type', 'client')
        .eq('read_by_shop', false);
      
      // Naviguer vers le SAV
      navigate(`/sav/${savCaseId}`);
      setIsOpen(false);
      
      // Réinitialiser l'indicateur d'activité
      if (hasNewActivity) {
        setHasNewActivity(false);
      }
    } catch (error) {
      console.error('Error marking SAV messages as read:', error);
      // Naviguer même en cas d'erreur
      navigate(`/sav/${savCaseId}`);
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Marquer toutes les notifications classiques comme lues
      await markAllAsRead();
      
      // Marquer tous les messages SAV non lus comme lus par le shop
      if (savWithUnreadMessages.length > 0) {
        const savCaseIds = savWithUnreadMessages.map(sav => sav.id);
        await supabase
          .from('sav_messages')
          .update({ read_by_shop: true })
          .in('sav_case_id', savCaseIds)
          .eq('sender_type', 'client')
          .eq('read_by_shop', false);
      }
      
      // Réinitialiser l'indicateur d'activité
      if (hasNewActivity) {
        setHasNewActivity(false);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (hasNewActivity) {
      setHasNewActivity(false);
    }
  };

  const getDisplayName = (sav: any) => {
    if (sav.sav_type === 'internal') {
      return `${sav.device_brand} ${sav.device_model} - ${sav.case_number}`;
    } else if (sav.customer) {
      return `${sav.customer.first_name} ${sav.customer.last_name}`;
    } else {
      return `SAV ${sav.case_number}`;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'stock_alert': return '📦';
      case 'order_needed': return '🛒';  
      case 'support_message': return '💬';
      case 'sav_message': return '🔧';
      default: return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else {
      return `Il y a ${diffDays}j`;
    }
  };

  const totalUnreadSAVMessages = savWithUnreadMessages.reduce((total, sav) => total + sav.unread_count, 0);
  const totalUnreadCount = unreadCount + totalUnreadSAVMessages;
  const showRedIndicator = hasNewActivity || totalUnreadCount > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative ${
            hasNewActivity 
              ? 'text-red-500 hover:text-red-600' 
              : unreadCount > 0 
                ? 'text-orange-500 hover:text-orange-600' 
                : ''
          } ${isAnimating ? 'animate-[bounce_0.3s_ease-in-out_infinite]' : ''}`}
          onClick={handleBellClick}
        >
          {showRedIndicator ? (
            <BellRing className={`h-5 w-5 ${hasNewActivity ? 'animate-pulse' : ''}`} />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {showRedIndicator && (
            <Badge 
              variant="destructive" 
              className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs ${
                hasNewActivity ? 'animate-pulse bg-red-600 border-red-600' : ''
              }`}
            >
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount || '!'}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {totalUnreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                Tout marquer lu
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {/* SAV Messages non lus */}
          {savWithUnreadMessages.length > 0 && (
            <div className="border-b">
              <div className="p-3 bg-orange-50">
                <h4 className="font-medium text-sm text-orange-700">Messages SAV non lus</h4>
              </div>
              {savWithUnreadMessages.map((sav, index) => (
                <div key={sav.id}>
                  <Card 
                    className="border-0 rounded-none cursor-pointer hover:bg-muted/50 bg-orange-50/50"
                    onClick={() => handleSAVClick(sav.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg" role="img" aria-label="sav-message">
                          🔧
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">
                              {getDisplayName(sav)}
                            </h4>
                            <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 ml-2"></div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {sav.unread_count} nouveau{sav.unread_count > 1 ? 'x' : ''} message{sav.unread_count > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {index < savWithUnreadMessages.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
          
          {/* Notifications classiques */}
          {notifications.length === 0 && savWithUnreadMessages.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Aucune notification
            </div>
          ) : notifications.length > 0 && (
            notifications.slice(0, 10).map((notification, index) => (
              <div key={notification.id}>
                <Card 
                  className={`border-0 rounded-none cursor-pointer hover:bg-muted/50 ${
                    !notification.read ? 'bg-muted/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-lg" role="img" aria-label="notification-icon">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                          )}
                        </div>
                          <p className="text-sm text-muted-foreground mt-1 break-words">
                            {notification.message}
                          </p>
                          {notification.message?.includes('/settings?tab=import-export') && (
                            <div className="mt-2">
                              <Button variant="outline" size="sm" onClick={() => { navigate('/settings?tab=import-export'); handleNotificationClick(notification.id); }}>
                                Ouvrir la page Export
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {index < notifications.length - 1 && <Separator />}
              </div>
            ))
          )}
        </div>
        
        {notifications.length > 10 && (
          <div className="p-3 border-t">
            <Button variant="ghost" size="sm" className="w-full">
              Voir toutes les notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}