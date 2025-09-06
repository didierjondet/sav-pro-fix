import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  amount_cents: number;
  currency: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  due_date: string | null;
  pdf_url: string | null;
}

interface SMSInvoice {
  id: string;
  invoice_number: string;
  sms_count: number;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  pdf_url: string | null;
  package_id: string;
}

export function useInvoices() {
  const [subscriptionInvoices, setSubscriptionInvoices] = useState<SubscriptionInvoice[]>([]);
  const [smsInvoices, setSMSInvoices] = useState<SMSInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubscriptionInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptionInvoices(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des factures d\'abonnement:', error);
    }
  };

  const fetchSMSInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSMSInvoices(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des factures SMS:', error);
    }
  };

  const fetchAllInvoices = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSubscriptionInvoices(),
        fetchSMSInvoices()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoicePDF = async (invoiceId: string, type: 'subscription' | 'sms') => {
    try {
      // TODO: Implémenter la génération PDF via une edge function
      console.log(`Génération PDF pour ${type} invoice ${invoiceId}`);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
    }
  };

  const downloadInvoice = async (invoiceId: string, type: 'subscription' | 'sms') => {
    try {
      // TODO: Implémenter le téléchargement
      console.log(`Téléchargement ${type} invoice ${invoiceId}`);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  const printInvoice = async (invoiceId: string, type: 'subscription' | 'sms') => {
    try {
      // TODO: Implémenter l'impression
      console.log(`Impression ${type} invoice ${invoiceId}`);
      window.print();
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
    }
  };

  useEffect(() => {
    fetchAllInvoices();
  }, []);

  return {
    subscriptionInvoices,
    smsInvoices,
    loading,
    fetchAllInvoices,
    generateInvoicePDF,
    downloadInvoice,
    printInvoice,
  };
}