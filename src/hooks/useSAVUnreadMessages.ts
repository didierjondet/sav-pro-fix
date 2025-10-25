import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SAVWithUnreadMessages {
  id: string;
  case_number: string;
  sav_type: 'client' | 'internal' | 'external';
  device_brand: string;
  device_model: string;
  unread_count: number;
  awaiting_reply?: boolean;
  customer?: {
    first_name: string;
    last_name: string;
  };
}

export function useSAVUnreadMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchUnreadMessages = async (): Promise<SAVWithUnreadMessages[]> => {
    if (!user) return [];

    try {
      console.log('🔍 Fetching open client conversations for user:', user.id);
      
      // Get user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      console.log('👤 User profile:', profile);

      if (!profile?.shop_id) {
        console.log('❌ No shop_id found for user');
        return [];
      }

      // Get all SAV cases that have client messages and are not closed (ready/delivered/cancelled)
      const { data: savCases, error: savError } = await supabase
        .from('sav_cases')
        .select(`
          id, 
          case_number, 
          sav_type,
          device_brand,
          device_model,
          status,
          customer:customers(first_name, last_name)
        `)
        .eq('shop_id', profile.shop_id)
        .not('status', 'in', '("ready","delivered","cancelled","closed","completed")');

      console.log('🏪 All open SAV cases:', { savCases, savError });

      if (savError) throw savError;

      if (!savCases || savCases.length === 0) {
        console.log('❌ No open SAV cases found');
        return [];
      }

      const savCaseIds = savCases.map(sav => sav.id);

      // Get client messages for these SAV cases
      const { data: clientMessages, error: msgError } = await supabase
        .from('sav_messages')
        .select(`
          sav_case_id,
          read_by_shop
        `)
        .eq('shop_id', profile.shop_id)
        .eq('sender_type', 'client')
        .in('sav_case_id', savCaseIds);

      console.log('💬 Client messages query result:', { clientMessages, msgError });

      if (msgError) throw msgError;

      // Get unique SAV case IDs that have client messages
      const savCaseIdsWithClientMessages = [...new Set((clientMessages || []).map(msg => msg.sav_case_id))];
      
      console.log('📋 SAV case IDs with client messages:', savCaseIdsWithClientMessages);

      if (savCaseIdsWithClientMessages.length === 0) {
        console.log('❌ No SAV cases with client messages found');
        return [];
      }

      // Fetch last message per SAV (any sender) to know if awaiting reply
      const { data: lastMsgs, error: lastErr } = await supabase
        .from('sav_messages')
        .select('sav_case_id, sender_type, created_at')
        .in('sav_case_id', savCaseIdsWithClientMessages)
        .order('created_at', { ascending: false });

      if (lastErr) throw lastErr;

      const lastByCase = new Map<string, { sender_type: string; created_at: string }>();
      (lastMsgs || []).forEach((m: any) => {
        if (!lastByCase.has(m.sav_case_id)) {
          lastByCase.set(m.sav_case_id, { sender_type: m.sender_type, created_at: m.created_at });
        }
      });

      // Build final list: only SAV cases that have client messages and are not closed
      const combined: SAVWithUnreadMessages[] = savCases
        .filter((savCase: any) => savCaseIdsWithClientMessages.includes(savCase.id))
        .map((savCase: any) => {
          const msgsForCase = (clientMessages || []).filter((msg: any) => msg.sav_case_id === savCase.id);
          const unreadCount = msgsForCase.filter((msg: any) => !msg.read_by_shop).length;
          const last = lastByCase.get(savCase.id);
          const awaitingReply = last ? last.sender_type === 'client' : false;
          
          return {
            id: savCase.id,
            case_number: savCase.case_number,
            sav_type: savCase.sav_type,
            device_brand: savCase.device_brand,
            device_model: savCase.device_model,
            customer: savCase.customer,
            unread_count: unreadCount,
            awaiting_reply: awaitingReply,
          } as SAVWithUnreadMessages;
        })
        .sort((a, b) => {
          // Sort by unread count desc, then by awaiting reply
          if (a.unread_count !== b.unread_count) {
            return b.unread_count - a.unread_count;
          }
          return b.awaiting_reply ? 1 : (a.awaiting_reply ? -1 : 0);
        });

      console.log('📊 Final open conversations list:', combined);
      return combined;
    } catch (error: any) {
      console.error('❌ Error fetching open conversations:', error);
      return [];
    }
  };

  const { data: savWithUnreadMessages = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['sav-unread-messages', user?.id],
    queryFn: fetchUnreadMessages,
    enabled: !!user,
    staleTime: 5 * 1000, // 5 secondes pour refresh rapide
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 1000, // Refetch automatique toutes les 10 secondes
  });

  const handleSAVClosed = useCallback(async (savCaseId: string) => {
    if (!savCaseId) return;
    
    try {
      console.log('🧹 Closing conversation for SAV:', savCaseId);
      
      // Marquer tous les messages comme lus par le magasin
      const { error } = await supabase
        .from('sav_messages')
        .update({ read_by_shop: true })
        .eq('sav_case_id', savCaseId)
        .eq('read_by_shop', false);
      
      if (error) {
        console.error('Error marking messages as read:', error);
      } else {
        console.log('✅ All messages marked as read for SAV:', savCaseId);
        
        // Déclencher un événement personnalisé pour fermer la discussion ouverte
        window.dispatchEvent(new CustomEvent('sav-conversation-close', { 
          detail: { savCaseId } 
        }));
        
        // Force cache invalidation for immediate UI update
        queryClient.invalidateQueries({ queryKey: ['sav-unread-messages'] });
      }
    } catch (error) {
      console.error('Error handling SAV closed:', error);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!user) return;

    // REALTIME DÉSACTIVÉ - Polling toutes les 60s pour performance
    console.log('📨 [SAVUnread] Polling activé - 60s');
    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['sav-unread-messages'] });
    }, 60000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [user, queryClient]);

  return {
    savWithUnreadMessages,
    loading,
    refetch,
    handleSAVClosed,
  };
}