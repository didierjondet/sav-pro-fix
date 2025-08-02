import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SAVWithUnreadMessages {
  id: string;
  case_number: string;
  unread_count: number;
}

export function useSAVUnreadMessages() {
  const [savWithUnreadMessages, setSavWithUnreadMessages] = useState<SAVWithUnreadMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUnreadMessages = async () => {
    if (!user) {
      setSavWithUnreadMessages([]);
      setLoading(false);
      return;
    }

    try {
      // Get user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.shop_id) {
        setSavWithUnreadMessages([]);
        setLoading(false);
        return;
      }

      // Get SAV cases with unread messages from clients
      const { data, error } = await supabase
        .from('sav_messages')
        .select(`
          sav_case_id
        `)
        .eq('shop_id', profile.shop_id)
        .eq('sender_type', 'client')
        .eq('read_by_shop', false);

      if (error) throw error;

      // Get unique SAV case IDs
      const savCaseIds = [...new Set((data || []).map(msg => msg.sav_case_id))];
      
      if (savCaseIds.length === 0) {
        setSavWithUnreadMessages([]);
        setLoading(false);
        return;
      }

      // Get SAV case details
      const { data: savCases, error: savError } = await supabase
        .from('sav_cases')
        .select('id, case_number')
        .in('id', savCaseIds);

      if (savError) throw savError;

      // Group by SAV case and count unread messages
      const grouped = (data || []).reduce((acc: Record<string, SAVWithUnreadMessages>, message) => {
        const savCase = savCases?.find(sc => sc.id === message.sav_case_id);
        if (savCase) {
          if (!acc[savCase.id]) {
            acc[savCase.id] = {
              id: savCase.id,
              case_number: savCase.case_number,
              unread_count: 0
            };
          }
          acc[savCase.id].unread_count++;
        }
        return acc;
      }, {});

      setSavWithUnreadMessages(Object.values(grouped));
    } catch (error: any) {
      console.error('Error fetching unread SAV messages:', error);
      setSavWithUnreadMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadMessages();

    if (!user) return;

    // Set up realtime listener for SAV messages
    const channel = supabase
      .channel('sav-unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sav_messages'
        },
        () => {
          fetchUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    savWithUnreadMessages,
    loading,
    refetch: fetchUnreadMessages,
  };
}