import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import type { Customer } from './useCustomers';

export function useAllCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { shop } = useShop();

  const fetchAllCustomers = async () => {
    if (!shop?.id) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data as Customer[]);
    } else {
      setCustomers([]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchAllCustomers();
  }, [shop?.id]);

  return { 
    customers, 
    loading,
    refetch: fetchAllCustomers
  };
}
