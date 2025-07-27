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

  const updatePart = async (partId: string, partData: Partial<Omit<Part, 'id' | 'created_at' | 'updated_at' | 'shop_id'>>) => {
    try {
      const { error } = await supabase
        .from('parts')
        .update(partData)
        .eq('id', partId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Pièce mise à jour",
      });

      fetchParts();
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

  const deletePart = async (partId: string) => {
    try {
      const { error } = await supabase
        .from('parts')
        .delete()
        .eq('id', partId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Pièce supprimée",
      });

      fetchParts();
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

  const adjustStock = async (partId: string, adjustment: number, reason?: string) => {
    try {
      const part = parts.find(p => p.id === partId);
      if (!part) throw new Error("Pièce introuvable");

      const newQuantity = Math.max(0, part.quantity + adjustment);
      
      const { error } = await supabase
        .from('parts')
        .update({ quantity: newQuantity })
        .eq('id', partId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Stock ${adjustment > 0 ? 'ajouté' : 'retiré'} : ${Math.abs(adjustment)} unité(s)`,
      });

      fetchParts();
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
    parts,
    loading,
    createPart,
    updatePart,
    deletePart,
    updatePartQuantity,
    adjustStock,
    refetch: fetchParts,
  };
}