import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { SupportMessage } from './useSupport';

export function useSupportMessages(ticketId?: string) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = async () => {
    if (!ticketId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select(`
          *,
          sender:profiles!support_messages_sender_id_fkey(first_name, last_name, user_id)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as SupportMessage[]);
    } catch (error: any) {
      console.error('Error fetching support messages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (!ticketId) return;

    // Set up realtime listener for messages
    const channel = supabase
      .channel(`support-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          console.log('Support message change detected:', payload);
          fetchMessages(); // Refetch messages when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const sendMessage = async (message: string, senderType: 'shop' | 'admin' = 'shop') => {
    if (!ticketId) return;

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert([{
          ticket_id: ticketId,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          sender_type: senderType,
          message: message
        }])
        .select()
        .single();

      if (error) throw error;

      // Messages will be automatically refreshed via realtime listener
      return { data, error: null };
    } catch (error: any) {
      console.error('Error sending support message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const markAsRead = async (isAdmin: boolean) => {
    if (!ticketId) return;

    try {
      const unreadMessages = messages.filter(msg => 
        isAdmin ? !msg.read_by_admin : !msg.read_by_shop
      );

      if (unreadMessages.length === 0) return;

      const updateField = isAdmin ? 'read_by_admin' : 'read_by_shop';
      
      const { error } = await supabase
        .from('support_messages')
        .update({ [updateField]: true })
        .in('id', unreadMessages.map(msg => msg.id));

      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    refetch: fetchMessages,
  };
}