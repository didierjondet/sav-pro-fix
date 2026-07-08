import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCustomerSAVs(customerId: string) {
  const [activeSAVCount, setActiveSAVCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveSAVs = async () => {
      try {
        // Récupérer le shop du client pour connaître ses statuts de clôture
        const { data: customer } = await supabase
          .from('customers')
          .select('shop_id')
          .eq('id', customerId)
          .maybeSingle();

        let finalKeys: string[] = ['ready', 'cancelled'];
        if (customer?.shop_id) {
          const { data: statuses } = await supabase
            .from('shop_sav_statuses')
            .select('status_key, is_final_status')
            .eq('shop_id', customer.shop_id)
            .eq('is_final_status', true);
          if (statuses && statuses.length > 0) {
            finalKeys = statuses.map((s: any) => s.status_key);
          }
        }

        const { data, error } = await supabase
          .from('sav_cases')
          .select('id, status')
          .eq('customer_id', customerId)
          .not('status', 'in', `(${finalKeys.join(',')})`);

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
