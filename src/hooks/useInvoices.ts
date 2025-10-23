import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  amount_cents: number;
  vat_rate: number;
  vat_amount_cents: number;
  total_ht_cents: number;
  total_ttc_cents: number;
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
  vat_rate: number;
  vat_amount_cents: number;
  total_ht_cents: number;
  total_ttc_cents: number;
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
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId, invoiceType: type }
      });

      if (error) throw error;
      
      if (data?.pdf_url) {
        console.log('PDF généré avec succès:', data.pdf_url);
        await fetchAllInvoices(); // Rafraîchir pour afficher le nouveau PDF
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      throw error;
    }
  };

  const downloadInvoice = async (invoiceId: string, type: 'subscription' | 'sms') => {
    try {
      const table = type === 'subscription' ? 'subscription_invoices' : 'sms_invoices';
      const { data, error } = await supabase
        .from(table)
        .select('pdf_url, invoice_number')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      
      if (data?.pdf_url) {
        // Télécharger le PDF
        const link = document.createElement('a');
        link.href = data.pdf_url;
        link.download = `${data.invoice_number}.pdf`;
        link.click();
      } else {
        throw new Error('PDF non disponible');
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      throw error;
    }
  };

  const printInvoice = async (invoiceId: string, type: 'subscription' | 'sms') => {
    try {
      const table = type === 'subscription' ? 'subscription_invoices' : 'sms_invoices';
      const { data, error } = await supabase
        .from(table)
        .select('pdf_url')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      
      if (data?.pdf_url) {
        // Ouvrir le PDF dans un nouvel onglet pour impression
        window.open(data.pdf_url, '_blank');
      } else {
        throw new Error('PDF non disponible');
      }
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      throw error;
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