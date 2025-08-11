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
  time_minutes?: number;
  notes?: string;
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
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        console.error('No shop_id found for current user');
        setParts([]);
        return;
      }

      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('shop_id', profile.shop_id)
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

  // Fonction pour trouver des pièces similaires
  const findSimilarParts = (name: string, excludeId?: string): Part[] => {
    if (!name || name.length < 3) return [];
    
    const normalizedName = name.toLowerCase().trim();
    
    return parts.filter(part => {
      if (excludeId && part.id === excludeId) return false;
      
      const partName = part.name.toLowerCase().trim();
      
      // Correspondance exacte
      if (partName === normalizedName) return true;
      
      // Correspondance si l'un contient l'autre
      if (partName.includes(normalizedName) || normalizedName.includes(partName)) return true;
      
      // Calcul de distance de Levenshtein simple pour détecter les fautes de frappe
      const distance = levenshteinDistance(partName, normalizedName);
      const maxLength = Math.max(partName.length, normalizedName.length);
      const similarity = 1 - (distance / maxLength);
      
      // Considérer comme similaire si plus de 70% de similarité
      return similarity > 0.7;
    });
  };

  // Fonction de calcul de distance de Levenshtein
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const createPart = async (partData: Omit<Part, 'id' | 'created_at' | 'updated_at' | 'shop_id'>) => {
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
        .from('parts')
        .insert([{ ...partData, shop_id: profile.shop_id, time_minutes: (partData as any).time_minutes ?? 15 }])
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
    findSimilarParts,
    refetch: fetchParts,
  };
}