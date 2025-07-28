import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SAVMessage {
  id: string;
  sav_case_id: string;
  sender_type: 'shop' | 'client';
  sender_name: string;
  message: string;
  created_at: string;
  read_by_client: boolean;
  read_by_shop: boolean;
  shop_id: string;
}

export function useSAVMessages(savCaseId?: string) {
  const [messages, setMessages] = useState<SAVMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = async () => {
    if (!savCaseId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sav_messages')
        .select('*')
        .eq('sav_case_id', savCaseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as SAVMessage[]);
    } catch (error: any) {
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

    if (!savCaseId) return;

    // Set up realtime listener for messages
    const channel = supabase
      .channel(`sav-messages-${savCaseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sav_messages',
          filter: `sav_case_id=eq.${savCaseId}`
        },
        (payload) => {
          console.log('Message change detected:', payload);
          fetchMessages(); // Refetch messages when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [savCaseId]);

  const sendMessage = async (message: string, senderName: string, senderType: 'shop' | 'client' = 'shop') => {
    if (!savCaseId) return;

    try {
      // Get shop_id from the SAV case
      const { data: savCase } = await supabase
        .from('sav_cases')
        .select('shop_id')
        .eq('id', savCaseId)
        .single();

      if (!savCase) throw new Error('Dossier SAV introuvable');

      const { data, error } = await supabase
        .from('sav_messages')
        .insert([{
          sav_case_id: savCaseId,
          sender_type: senderType,
          sender_name: senderName,
          message: message,
          shop_id: savCase.shop_id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé avec succès",
      });

      fetchMessages();
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const markAsRead = async (messageId: string, readBy: 'client' | 'shop') => {
    try {
      const updateField = readBy === 'client' ? 'read_by_client' : 'read_by_shop';
      
      const { error } = await supabase
        .from('sav_messages')
        .update({ [updateField]: true })
        .eq('id', messageId);

      if (error) throw error;
      fetchMessages();
    } catch (error: any) {
      console.error('Error marking message as read:', error);
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