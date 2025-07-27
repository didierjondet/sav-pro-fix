import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuoteItem {
  part_id: string;
  part_name: string;
  part_reference?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Quote {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  items: QuoteItem[];
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
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
      const { data, error } = await supabase
        .from('quotes' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes((data as any) || []);
    } catch (error: any) {
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
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop non trouvé pour cet utilisateur');
      }

      const { data, error } = await supabase
        .from('quotes' as any)
        .insert([{ ...quoteData, shop_id: profile.shop_id }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Devis créé avec succès",
      });

      fetchQuotes();
      return { data, error: null };
    } catch (error: any) {
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
      const { error } = await supabase
        .from('quotes' as any)
        .update(quoteData)
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