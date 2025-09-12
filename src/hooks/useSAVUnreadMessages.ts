import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SAVWithUnreadMessages {
  id: string;
  case_number: string;
  sav_type: 'client' | 'internal' | 'external';
  device_brand: string;
  device_model: string;
  unread_count: number;
  customer?: {
    first_name: string;
    last_name: string;
  };
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
      console.log('🔍 Fetching unread messages for user:', user.id);
      
      // Get user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      console.log('👤 User profile:', profile);

      if (!profile?.shop_id) {
        console.log('❌ No shop_id found for user');
        setSavWithUnreadMessages([]);
        setLoading(false);
        return;
      }

      // Get all SAV cases with messages (read or unread), not just unread ones
      const { data, error } = await supabase
        .from('sav_messages')
        .select(`
          sav_case_id,
          read_by_shop
        `)
        .eq('shop_id', profile.shop_id)
        .eq('sender_type', 'client');

      console.log('💬 Unread messages query result:', { data, error });

      if (error) throw error;

      // Get unique SAV case IDs
      const savCaseIds = [...new Set((data || []).map(msg => msg.sav_case_id))];
      
      console.log('📋 Unique SAV case IDs with unread messages:', savCaseIds);
      
      if (savCaseIds.length === 0) {
        console.log('❌ No SAV cases with unread messages found');
        setSavWithUnreadMessages([]);
        setLoading(false);
        return;
      }

      // Get SAV case details with customer info for ALL cases that have unread messages
      // Show notifications for ALL SAV cases with unread messages, regardless of status
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
        .in('id', savCaseIds);

      console.log('🏪 SAV cases query result:', { savCases, savError });

      if (savError) throw savError;

      // Group by SAV case and count only unread messages
      const grouped = (data || []).reduce((acc: Record<string, SAVWithUnreadMessages>, message) => {
        const savCase = savCases?.find(sc => sc.id === message.sav_case_id);
        if (savCase) {
          if (!acc[savCase.id]) {
            acc[savCase.id] = {
              id: savCase.id,
              case_number: savCase.case_number,
              sav_type: savCase.sav_type,
              device_brand: savCase.device_brand,
              device_model: savCase.device_model,
              customer: savCase.customer,
              unread_count: 0
            };
          }
          // Only count unread messages
          if (!message.read_by_shop) {
            acc[savCase.id].unread_count++;
          }
        }
        return acc;
      }, {});

      // Filter out SAV cases with no unread messages
      const filteredGrouped = Object.values(grouped).filter(sav => sav.unread_count > 0);

      console.log('📊 Final grouped result:', filteredGrouped);
      setSavWithUnreadMessages(filteredGrouped);
    } catch (error: any) {
      console.error('❌ Error fetching unread SAV messages:', error);
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