import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SAVTrackingMessage {
  id: string;
  sender_type: 'shop' | 'client';
  sender_name: string;
  message: string;
  created_at: string;
}

export function useSAVTrackingMessages(trackingSlug?: string) {
  const [messages, setMessages] = useState<SAVTrackingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = async () => {
    if (!trackingSlug) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_tracking_messages', { p_tracking_slug: trackingSlug });

      if (error) throw error;
      setMessages((data || []) as SAVTrackingMessage[]);
    } catch (error: any) {
      console.error('Error fetching tracking messages:', error);
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

    // Setup real-time subscription for messages
    if (trackingSlug) {
      console.log('🔄 Setting up real-time for tracking slug:', trackingSlug);
      
      const channel = supabase
        .channel(`tracking-messages-${trackingSlug}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sav_messages'
          },
          (payload) => {
            console.log('📨 Real-time tracking message update:', payload);
            // Refetch messages immediately for any change in the sav_messages table
            setTimeout(() => fetchMessages(), 100); // Small delay to ensure DB consistency
          }
        )
        .subscribe((status) => {
          console.log('📡 Tracking messages subscription status:', status);
        });

      return () => {
        console.log('Cleaning up tracking messages subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [trackingSlug]);

  const sendMessage = async (message: string, senderName: string, senderType: 'client' | 'shop' = 'client') => {
    if (!trackingSlug) return null;

    try {
      if (senderType === 'client') {
        // Pour les messages clients publics, insérer directement sans RPC
        const { data: trackingData } = await supabase
          .rpc('get_tracking_info', { p_tracking_slug: trackingSlug });

        if (!trackingData || trackingData.length === 0) {
          throw new Error('SAV case non trouvé');
        }

        // Récupérer les IDs nécessaires
        const { data: savCaseData } = await supabase
          .from('sav_cases')
          .select('id, shop_id')
          .eq('tracking_slug', trackingSlug)
          .single();

        if (!savCaseData) {
          throw new Error('Impossible de récupérer les informations du dossier SAV');
        }

        // Insérer le message directement 
        const { data, error } = await supabase
          .from('sav_messages')
          .insert({
            sav_case_id: savCaseData.id,
            shop_id: savCaseData.shop_id,
            sender_type: 'client',
            sender_name: senderName,
            message: message,
            read_by_client: true,
            read_by_shop: false,
          })
          .select()
          .single();

        if (error) throw error;

        fetchMessages();
        return { data, error: null };
      } else {
        // Pour les messages du magasin (authentifiés)
        const { data: trackingData } = await supabase
          .rpc('get_tracking_info', { p_tracking_slug: trackingSlug });

        if (!trackingData || trackingData.length === 0) {
          throw new Error('SAV case non trouvé');
        }

        const { data: savCaseData } = await supabase
          .from('sav_cases')
          .select('id, shop_id')
          .eq('tracking_slug', trackingSlug)
          .single();

        if (!savCaseData) {
          throw new Error('Impossible de récupérer l\'ID du dossier SAV');
        }

        const { data, error } = await supabase
          .from('sav_messages')
          .insert({
            sav_case_id: savCaseData.id,
            shop_id: savCaseData.shop_id,
            sender_type: senderType,
            sender_name: senderName,
            message: message,
            read_by_client: false,
            read_by_shop: true,
          })
          .select()
          .single();

        if (error) throw error;

        fetchMessages();
        return { data, error: null };
      }
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

  const markAsRead = async (messageId: string, userType: 'client' | 'shop' = 'client') => {
    try {
      const updateField = userType === 'client' ? 'read_by_client' : 'read_by_shop';
      
      const { error } = await supabase
        .from('sav_messages')
        .update({ [updateField]: true })
        .eq('id', messageId);

      if (error) throw error;
      
      // Actualiser les messages après marquage
      fetchMessages();
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('sav_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      
      // Actualiser les messages après suppression
      fetchMessages();
      
      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé avec succès",
      });
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    deleteMessage,
    refetch: fetchMessages,
  };
}