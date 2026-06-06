import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { useSAVUnreadMessages } from '@/hooks/useSAVUnreadMessages';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { savWithUnreadMessages, refetch: refetchSAVMessages } = useSAVUnreadMessages();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'stock_alert': return '📦';
      case 'order_needed': return '🛒';  
      case 'support_message': return '💬';
      case 'sav_message': return '🔧';
      case 'sav_delay_alert': return '⏰';
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

  const getDisplayName = (sav: any) => {
    // PRIORITÉ 1 : Nom du client
    if (sav.customer?.first_name && sav.customer?.last_name) {
      return `${sav.customer.first_name} ${sav.customer.last_name}`;
    }
    
    // PRIORITÉ 2 : SAV interne (marque + modèle)
    if (sav.sav_type === 'internal' && sav.device_brand && sav.device_model) {
      return `${sav.device_brand} ${sav.device_model}`;
    }
    
    // PRIORITÉ 3 : Fallback sur le numéro de dossier
    return `SAV ${sav.case_number}`;
  };

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleSAVClick = async (savCaseId: string) => {
    try {
      await supabase
        .from('sav_messages')
        .update({ read_by_shop: true })
        .eq('sav_case_id', savCaseId)
        .eq('sender_type', 'client')
        .eq('read_by_shop', false);
      
      refetchSAVMessages();
      navigate(`/sav/${savCaseId}`);
    } catch (error) {
      console.error('Error marking SAV messages as read:', error);
      navigate(`/sav/${savCaseId}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // 1. Marquer notifications classiques
      await markAllAsRead();
      
      // 2. Marquer tous les messages SAV non lus
      if (profile?.shop_id) {
        await supabase
          .from('sav_messages')
          .update({ read_by_shop: true })
          .eq('shop_id', profile.shop_id)
          .eq('sender_type', 'client')
          .eq('read_by_shop', false);
      }
      
      // 3. Rafraîchir
      refetchSAVMessages();
      
      toast({
        title: "Tout marqué comme lu",
        description: "Toutes les notifications ont été marquées comme lues"
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer tout comme lu",
        variant: "destructive"
      });
    }
  };

  const totalUnreadSAVMessages = savWithUnreadMessages.reduce((total, sav) => total + sav.unread_count, 0);
  const totalUnreadCount = unreadCount + totalUnreadSAVMessages;

  const handleBack = () => {
    // Retour vers la page précédente si elle existe, sinon Dashboard
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/Dashboard');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Toutes les notifications</CardTitle>
            {totalUnreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline" className="w-full sm:w-auto">
                Marquer tout comme lu ({totalUnreadCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SAV Messages non lus */}
          {savWithUnreadMessages.length > 0 && (
            <div>
              <h3 className="font-semibold text-orange-700 mb-3">Messages SAV non lus</h3>
              <div className="space-y-2">
                {savWithUnreadMessages.map((sav) => (
                  <Card 
                    key={sav.id}
                    className="cursor-pointer hover:bg-muted/50 bg-orange-50/50"
                    onClick={() => handleSAVClick(sav.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">🔧</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              {getDisplayName(sav)}
                            </h4>
                            <Badge variant="destructive">
                              {sav.unread_count} nouveau{sav.unread_count > 1 ? 'x' : ''} message{sav.unread_count > 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {notifications.length > 0 && <Separator className="my-4" />}
            </div>
          )}
          
          {/* Notifications classiques */}
          {notifications.length > 0 ? (
            <div>
              <h3 className="font-semibold mb-3">Autres notifications</h3>
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Card 
                    key={notification.id}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      !notification.read ? 'bg-muted/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <Badge variant="secondary">Nouveau</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : savWithUnreadMessages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucune notification
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}