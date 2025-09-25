import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCustomerSAVs(customerId: string) {
  const [activeSAVCount, setActiveSAVCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveSAVs = async () => {
      try {
        const { data, error } = await supabase
          .from('sav_cases')
          .select('id, status')
          .eq('customer_id', customerId)
          .not('status', 'in', '(ready,cancelled)');

        if (error) throw error;
        setActiveSAVCount(data?.length || 0);
      } catch (error) {
        console.error('Error fetching customer SAVs:', error);
        setActiveSAVCount(0);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchActiveSAVs();
    }
  }, [customerId]);

  return { activeSAVCount, loading };
}