import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuoteItem {
  part_id: string;
  part_name: string;
  part_reference?: string;
  quantity: number;
  unit_public_price: number; // Prix public (vente)
  unit_purchase_price: number; // Prix d'achat (coût)
  total_price: number;
}

export interface Quote {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  // Device info (parité avec SAV)
  device_brand?: string | null;
  device_model?: string | null;
  device_imei?: string | null;
  sku?: string | null;
  problem_description?: string | null;
  repair_notes?: string | null;
  items: QuoteItem[];
  total_amount: number;
  status: 'draft' | 'pending_review' | 'sent' | 'under_negotiation' | 'accepted' | 'rejected' | 'expired';
  shop_id: string;
  created_at: string;
  updated_at: string;
}

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchQuotes = async () => {
    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        console.error('No shop_id found for current user');
        setQuotes([]);
        return;
      }

      const { data, error } = await supabase
        .from('quotes' as any)
        .select('*')
        .eq('shop_id', profile.shop_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
// Parse JSON items field with backward compatibility for pricing fields
const parsedData = (data as any[])?.map(quote => {
  const rawItems = typeof quote.items === 'string' ? JSON.parse(quote.items) : (quote.items || []);
  const items = (rawItems as any[]).map((it: any) => ({
    ...it,
    unit_public_price: it.unit_public_price ?? it.unit_price ?? 0,
    unit_purchase_price: it.unit_purchase_price ?? 0,
    total_price: it.total_price ?? ((it.quantity || 0) * (it.unit_public_price ?? it.unit_price ?? 0)),
  }));
  return { ...quote, items };
}) || [];
      
      setQuotes(parsedData);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les devis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const createQuote = async (quoteData: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'shop_id' | 'quote_number'>) => {
    try {
      console.log('Creating quote with data:', quoteData);
      
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop non trouvé pour cet utilisateur');
      }

      console.log('Shop ID found:', profile.shop_id);

      // Prepare data for insertion with JSON serialization
      const insertData = {
        customer_name: quoteData.customer_name,
        customer_email: quoteData.customer_email,
        customer_phone: quoteData.customer_phone,
        // Device info
        device_brand: quoteData.device_brand ?? null,
        device_model: quoteData.device_model ?? null,
        device_imei: quoteData.device_imei ?? null,
        sku: quoteData.sku ?? null,
        problem_description: quoteData.problem_description ?? null,
        repair_notes: quoteData.repair_notes ?? null,
        items: JSON.stringify(quoteData.items), // Ensure JSON serialization
        total_amount: quoteData.total_amount,
        status: quoteData.status,
        shop_id: profile.shop_id
      };

      console.log('Insert data prepared:', insertData);

      const { data, error } = await supabase
        .from('quotes' as any)
        .insert([insertData])
        .select()
        .single();

      console.log('Supabase response:', { data, error });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Devis créé avec succès",
      });

      fetchQuotes();
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating quote:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const updateQuote = async (quoteId: string, quoteData: Partial<Quote>) => {
    try {
      // Si le statut est "rejected", supprimer définitivement le devis
      if (quoteData.status === 'rejected') {
        await deleteQuote(quoteId);
        return { error: null };
      }

      // Ensure JSON serialization for items when provided
      const payload: any = { ...quoteData };
      if (payload.items && typeof payload.items !== 'string') {
        payload.items = JSON.stringify(payload.items);
      }

      const { error } = await supabase
        .from('quotes' as any)
        .update(payload)
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Devis mis à jour",
      });

      fetchQuotes();
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const deleteQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quotes' as any)
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Devis supprimé",
      });

      fetchQuotes();
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  return {
    quotes,
    loading,
    createQuote,
    updateQuote,
    deleteQuote,
    refetch: fetchQuotes,
  };
}