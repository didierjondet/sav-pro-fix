import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  sav_case_id: string;
  sender_type: 'shop' | 'client' | 'sms';
  sender_name: string;
  message: string;
  created_at: string;
  read_by_client: boolean;
  read_by_shop: boolean;
  shop_id: string;
}

interface UseMessagingProps {
  savCaseId?: string;
  trackingSlug?: string;
  userType: 'shop' | 'client';
}

export function useMessaging({ savCaseId, trackingSlug, userType }: UseMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fonction pour récupérer les messages
  const fetchMessages = async () => {
    if (!savCaseId && !trackingSlug) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      let query;
      
      if (userType === 'shop' && savCaseId) {
        // Pour les utilisateurs authentifiés du magasin
        query = supabase
          .from('sav_messages')
          .select('*')
          .eq('sav_case_id', savCaseId)
          .order('created_at', { ascending: true });
      } else if (userType === 'client' && trackingSlug) {
        // Pour les clients publics via tracking slug
        query = supabase
          .rpc('get_tracking_messages', { p_tracking_slug: trackingSlug });
      } else {
        throw new Error('Configuration invalide');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Normaliser les données selon le type de requête
      const normalizedData = userType === 'client' && trackingSlug ? 
        (data || []).map((msg: any) => ({
          id: msg.id || `${msg.sender_type}-${msg.created_at}`,
          sav_case_id: '',
          sender_type: msg.sender_type,
          sender_name: msg.sender_name,
          message: msg.message,
          created_at: msg.created_at,
          read_by_client: true,
          read_by_shop: msg.sender_type === 'shop',
          shop_id: ''
        })) : (data || []);

      setMessages(normalizedData as Message[]);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Configuration du real-time
  useEffect(() => {
    fetchMessages();

    if (!savCaseId && !trackingSlug) return;

    // Configuration du canal real-time unifié
    const channelName = savCaseId ? `sav-messages-${savCaseId}` : `tracking-messages-${trackingSlug}`;
    
    console.log(`🔄 Setting up real-time channel: ${channelName}`);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sav_messages',
          ...(savCaseId ? { filter: `sav_case_id=eq.${savCaseId}` } : {})
        },
        (payload) => {
          console.log('📨 Real-time message change:', payload.eventType, payload);
          // Refetch messages après un petit délai pour assurer la consistance
          setTimeout(() => fetchMessages(), 100);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Real-time subscription status for ${channelName}:`, status);
      });

    return () => {
      console.log(`Cleaning up real-time channel: ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [savCaseId, trackingSlug]);

  // Fonction pour envoyer un message
  const sendMessage = async (message: string, senderName: string) => {
    if (!message.trim()) return null;

    try {
      let insertData;
      let shopId;

      if (userType === 'shop' && savCaseId) {
        // Pour les utilisateurs du magasin
        const { data: savCase } = await supabase
          .from('sav_cases')
          .select('shop_id')
          .eq('id', savCaseId)
          .single();

        if (!savCase) throw new Error('Dossier SAV introuvable');
        shopId = savCase.shop_id;

        insertData = {
          sav_case_id: savCaseId,
          sender_type: 'shop',
          sender_name: senderName,
          message: message.trim(),
          shop_id: shopId,
          read_by_shop: true,
          read_by_client: false
        };
      } else if (userType === 'client' && trackingSlug) {
        // Pour les clients publics
        const { data: savCase } = await supabase
          .from('sav_cases')
          .select('id, shop_id')
          .eq('tracking_slug', trackingSlug)
          .single();

        if (!savCase) throw new Error('Dossier SAV introuvable');

        insertData = {
          sav_case_id: savCase.id,
          sender_type: 'client',
          sender_name: senderName,
          message: message.trim(),
          shop_id: savCase.shop_id,
          read_by_client: true,
          read_by_shop: false
        };
      } else {
        throw new Error('Configuration invalide pour l\'envoi');
      }

      const { data, error } = await supabase
        .from('sav_messages')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Refetch messages après l'envoi
      fetchMessages();
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  // Fonction pour supprimer un message (unifié)
  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('sav_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé avec succès",
      });

      // Refetch messages après suppression
      fetchMessages();
    } catch (error: any) {
      console.error('Error deleting message:', error);
      
      let errorMessage = "Impossible de supprimer le message";
      if (error.message?.includes('violates row-level security policy')) {
        errorMessage = "Le message ne peut être supprimé que dans la minute suivant son envoi";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Fonction pour marquer comme lu
  const markAsRead = async (messageId: string) => {
    try {
      const updateField = userType === 'client' ? 'read_by_client' : 'read_by_shop';
      
      const { error } = await supabase
        .from('sav_messages')
        .update({ [updateField]: true })
        .eq('id', messageId);

      if (error) throw error;
      
      // Refetch messages après marquage
      fetchMessages();
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  // Fonction pour marquer tous les messages comme lus
  const markAllAsRead = async () => {
    if (!savCaseId && !trackingSlug) return;
    
    try {
      const updateField = userType === 'client' ? 'read_by_client' : 'read_by_shop';
      
      let query;
      if (savCaseId) {
        query = supabase
          .from('sav_messages')
          .update({ [updateField]: true })
          .eq('sav_case_id', savCaseId)
          .eq(updateField, false);
      } else if (trackingSlug) {
        // Pour les clients avec tracking slug, il faut d'abord récupérer l'ID du SAV case
        const { data: savCase } = await supabase
          .from('sav_cases')
          .select('id')
          .eq('tracking_slug', trackingSlug)
          .single();

        if (!savCase) return;

        query = supabase
          .from('sav_messages')
          .update({ [updateField]: true })
          .eq('sav_case_id', savCase.id)
          .eq(updateField, false);
      }

      if (query) {
        const { error } = await query;
        if (error) throw error;
        fetchMessages();
      }
    } catch (error: any) {
      console.error('Error marking all messages as read:', error);
    }
  };

  // Fonction pour vérifier si un message peut être supprimé
  const canDeleteMessage = (message: Message) => {
    const messageTime = new Date(message.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - messageTime.getTime();
    const oneMinute = 60000;

    // Vérifier si le message a moins d'1 minute ET si c'est le bon type d'utilisateur
    return timeDiff < oneMinute && 
           ((userType === 'shop' && message.sender_type === 'shop') ||
            (userType === 'client' && message.sender_type === 'client'));
  };

  return {
    messages,
    loading,
    sendMessage,
    deleteMessage,
    markAsRead,
    markAllAsRead,
    canDeleteMessage,
    refetch: fetchMessages,
  };
}