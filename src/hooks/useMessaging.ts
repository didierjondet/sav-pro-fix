import { useState, useEffect, useCallback, useRef } from 'react';
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
  attachments?: any[];
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

  // Stable refs to avoid re-creating callbacks
  const savCaseIdRef = useRef(savCaseId);
  const trackingSlugRef = useRef(trackingSlug);
  const userTypeRef = useRef(userType);

  savCaseIdRef.current = savCaseId;
  trackingSlugRef.current = trackingSlug;
  userTypeRef.current = userType;

  const fetchMessages = useCallback(async () => {
    const currentSavCaseId = savCaseIdRef.current;
    const currentTrackingSlug = trackingSlugRef.current;
    const currentUserType = userTypeRef.current;

    if (!currentSavCaseId && !currentTrackingSlug) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      let query;
      
      if (currentUserType === 'shop' && currentSavCaseId) {
        query = supabase
          .from('sav_messages')
          .select('*')
          .eq('sav_case_id', currentSavCaseId)
          .order('created_at', { ascending: true });
      } else if (currentUserType === 'client' && currentTrackingSlug) {
        query = supabase
          .rpc('get_tracking_messages', { p_tracking_slug: currentTrackingSlug });
      } else {
        throw new Error('Configuration invalide');
      }

      const { data, error } = await query;
      if (error) throw error;

      const normalizedData = currentUserType === 'client' && currentTrackingSlug ? 
        (data || []).map((msg: any) => ({
          id: msg.id || `${msg.sender_type}-${msg.created_at}`,
          sav_case_id: '',
          sender_type: msg.sender_type,
          sender_name: msg.sender_name,
          message: msg.message,
          created_at: msg.created_at,
          read_by_client: true,
          read_by_shop: msg.sender_type === 'shop',
          shop_id: '',
          attachments: msg.attachments || []
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
  }, []); // stable - uses refs

  // Polling setup
  useEffect(() => {
    fetchMessages();

    if (!savCaseId && !trackingSlug) return;

    console.log('📨 [Messaging] Polling activé - 30s');
    const pollInterval = setInterval(fetchMessages, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [savCaseId, trackingSlug, fetchMessages]);

  const sendMessage = useCallback(async (message: string, senderName: string, attachments: any[] = []) => {
    if (!message.trim()) return null;

    try {
      const currentSavCaseId = savCaseIdRef.current;
      const currentTrackingSlug = trackingSlugRef.current;
      const currentUserType = userTypeRef.current;

      if (currentUserType === 'shop' && currentSavCaseId) {
        const { data: savCase } = await supabase
          .from('sav_cases')
          .select('shop_id')
          .eq('id', currentSavCaseId)
          .single();

        if (!savCase) throw new Error('Dossier SAV introuvable');

        const insertData = {
          sav_case_id: currentSavCaseId,
          sender_type: 'shop',
          sender_name: senderName,
          message: message.trim(),
          shop_id: savCase.shop_id,
          read_by_shop: true,
          read_by_client: false,
          attachments: attachments
        };

        const { data, error } = await supabase
          .from('sav_messages')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        fetchMessages();
        return { data, error: null };

      } else if (currentUserType === 'client' && currentTrackingSlug) {
        const { data, error } = await supabase.rpc('send_client_tracking_message', {
          p_tracking_slug: currentTrackingSlug,
          p_sender_name: senderName,
          p_message: message.trim()
        });

        if (error) throw error;
        fetchMessages();
        return { data: 'success', error: null };
      } else {
        throw new Error('Configuration invalide pour l\'envoi');
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
  }, [fetchMessages]);

  const deleteMessage = useCallback(async (messageId: string) => {
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
  }, [fetchMessages]);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const updateField = userTypeRef.current === 'client' ? 'read_by_client' : 'read_by_shop';
      
      const { error } = await supabase
        .from('sav_messages')
        .update({ [updateField]: true } as any)
        .eq('id', messageId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const currentSavCaseId = savCaseIdRef.current;
    const currentTrackingSlug = trackingSlugRef.current;
    const currentUserType = userTypeRef.current;

    if (!currentSavCaseId && !currentTrackingSlug) return;
    
    try {
      const updateField = currentUserType === 'client' ? 'read_by_client' : 'read_by_shop';
      const senderTypeToMark = currentUserType === 'client' ? 'shop' : 'client';
      
      let caseId = currentSavCaseId;
      
      if (!caseId && currentTrackingSlug) {
        const { data: savCase } = await supabase
          .from('sav_cases')
          .select('id')
          .eq('tracking_slug', currentTrackingSlug)
          .single();

        if (!savCase) return;
        caseId = savCase.id;
      }

      if (!caseId) return;

      const { error } = await supabase
        .from('sav_messages')
        .update({ [updateField]: true })
        .eq('sav_case_id', caseId)
        .eq('sender_type', senderTypeToMark)
        .eq(updateField, false);

      if (error) {
        console.error('❌ Error marking messages as read:', error);
        throw error;
      }
      // Do NOT call fetchMessages here to avoid loops
    } catch (error: any) {
      console.error('Error marking all messages as read:', error);
    }
  }, []);

  const canDeleteMessage = useCallback((message: Message) => {
    const messageTime = new Date(message.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - messageTime.getTime();
    const oneMinute = 60000;

    return timeDiff < oneMinute && 
           ((userTypeRef.current === 'shop' && message.sender_type === 'shop') ||
            (userTypeRef.current === 'client' && message.sender_type === 'client'));
  }, []);

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
