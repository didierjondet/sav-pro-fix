import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemAlert {
  id: string;
  alert_type: string;
  name: string;
  is_enabled: boolean;
  threshold_value: number | null;
  check_frequency_hours: number;
  sms_message_1: string | null;
  sms_message_2: string | null;
  sms_message_3: string | null;
  last_check_at: string | null;
  last_alert_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des alertes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les alertes système',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAlert = async (alertId: string, updates: Partial<SystemAlert>) => {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update(updates)
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Alerte mise à jour avec succès',
      });

      await fetchAlerts();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de l\'alerte:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour l\'alerte',
        variant: 'destructive',
      });
    }
  };

  const createAlert = async (alertData: Omit<SystemAlert, 'id' | 'created_at' | 'updated_at' | 'last_check_at' | 'last_alert_sent_at'>) => {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .insert(alertData);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Alerte créée avec succès',
      });

      await fetchAlerts();
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'alerte:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer l\'alerte',
        variant: 'destructive',
      });
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Alerte supprimée avec succès',
      });

      await fetchAlerts();
    } catch (error: any) {
      console.error('Erreur lors de la suppression de l\'alerte:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'alerte',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return {
    alerts,
    loading,
    fetchAlerts,
    updateAlert,
    createAlert,
    deleteAlert,
  };
}