import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Part {
  id: string;
  name: string;
  reference?: string;
  purchase_price?: number;
  selling_price?: number;
  quantity: number;
  min_stock: number;
  shop_id: string;
  created_at: string;
  updated_at: string;
}

export function useParts() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchParts = async () => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setParts(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les pièces",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

  const createPart = async (partData: Omit<Part, 'id' | 'created_at' | 'updated_at' | 'shop_id'>) => {
    try {
      const { data, error } = await supabase
        .from('parts')
        .insert([partData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Pièce créée avec succès",
      });

      fetchParts();
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

  const updatePartQuantity = async (partId: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from('parts')
        .update({ quantity })
        .eq('id', partId);

      if (error) throw error;
      fetchParts();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    parts,
    loading,
    createPart,
    updatePartQuantity,
    refetch: fetchParts,
  };
}