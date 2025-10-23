import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InvoiceConfig {
  id: string;
  company_name: string;
  company_legal_form: string;
  service_name: string;
  company_address: string | null;
  company_postal_code: string | null;
  company_city: string | null;
  company_siret: string | null;
  company_vat_number: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_website: string | null;
  header_logo_url: string | null;
  header_text: string | null;
  footer_text: string | null;
  vat_rate: number;
  legal_text: string | null;
  bank_details: any;
  created_at: string;
  updated_at: string;
}

export interface InvoiceNotificationConfig {
  id: string;
  notification_type: 'subscription' | 'sms_package';
  in_app_enabled: boolean;
  sms_enabled: boolean;
  sms_message_template: string | null;
  created_at: string;
  updated_at: string;
}

export function useInvoiceConfig() {
  const [config, setConfig] = useState<InvoiceConfig | null>(null);
  const [notificationConfigs, setNotificationConfigs] = useState<InvoiceNotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoice_config')
        .select('*')
        .single();

      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
      toast.error('Impossible de charger la configuration des factures');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_notifications_config')
        .select('*')
        .order('notification_type');

      if (error) throw error;
      setNotificationConfigs((data as InvoiceNotificationConfig[]) || []);
    } catch (error) {
      console.error('Erreur lors du chargement des configs de notification:', error);
    }
  };

  const updateConfig = async (updates: Partial<InvoiceConfig>) => {
    try {
      if (!config) return;

      const { error } = await supabase
        .from('invoice_config')
        .update(updates)
        .eq('id', config.id);

      if (error) throw error;

      await fetchConfig();
      toast.success('Configuration mise à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Impossible de mettre à jour la configuration');
    }
  };

  const updateNotificationConfig = async (
    notificationType: 'subscription' | 'sms_package',
    updates: Partial<InvoiceNotificationConfig>
  ) => {
    try {
      const { error } = await supabase
        .from('invoice_notifications_config')
        .update(updates)
        .eq('notification_type', notificationType);

      if (error) throw error;

      await fetchNotificationConfigs();
      toast.success('Configuration des notifications mise à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des notifications:', error);
      toast.error('Impossible de mettre à jour les notifications');
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `invoice-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('shop-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('shop-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erreur lors de l\'upload du logo:', error);
      toast.error('Impossible d\'uploader le logo');
      return null;
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchNotificationConfigs();
  }, []);

  return {
    config,
    notificationConfigs,
    loading,
    updateConfig,
    updateNotificationConfig,
    uploadLogo,
    refreshConfig: fetchConfig,
    refreshNotificationConfigs: fetchNotificationConfigs,
  };
}
