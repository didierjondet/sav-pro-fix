import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GlobalSMSCredits {
  id: string;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  twilio_balance_usd: number;
  last_sync_at: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

export function useGlobalSMSCredits() {
  const [globalCredits, setGlobalCredits] = useState<GlobalSMSCredits | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchGlobalCredits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_sms_credits')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      setGlobalCredits(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des crédits globaux:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalCredits();
  }, []);

  return {
    globalCredits,
    loading,
    fetchGlobalCredits,
  };
}