import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';

export interface Part {
  id: string;
  name: string;
  reference?: string;
  sku?: string;
  supplier?: string;
  purchase_price?: number;
  selling_price?: number;
  quantity: number;
  reserved_quantity?: number;
  min_stock: number;
  time_minutes?: number;
  notes?: string;
  photo_url?: string;
  shop_id: string;
  created_at: string;
  updated_at: string;
  price_last_updated?: string;
}

export interface PartStatistics {
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
}

export function useParts(page: number = 1, itemsPerPage: number = 20, searchTerm: string = '') {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [statistics, setStatistics] = useState<PartStatistics>({
    totalQuantity: 0,
    totalValue: 0,
    lowStockCount: 0
  });
  const { toast } = useToast();
  const { shop } = useShop();

  const fetchStatistics = async () => {
    try {
      if (!shop?.id) {
        setStatistics({ totalQuantity: 0, totalValue: 0, lowStockCount: 0 });
        return;
      }

      // Fetch aggregated statistics directly
      const { data, error } = await supabase
        .from('parts')
        .select('quantity, purchase_price, min_stock')
        .eq('shop_id', shop.id);

      if (error) throw error;

      if (data) {
        const totalQuantity = data.reduce((sum, part) => sum + (part.quantity || 0), 0);
        const totalValue = data.reduce((sum, part) => 
          sum + ((part.quantity || 0) * (part.purchase_price || 0)), 0
        );
        const lowStockCount = data.filter(part => 
          (part.quantity || 0) <= (part.min_stock || 0)
        ).length;

        setStatistics({
          totalQuantity,
          totalValue,
          lowStockCount
        });
      }
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
      setStatistics({ totalQuantity: 0, totalValue: 0, lowStockCount: 0 });
    }
  };

  const fetchParts = async () => {
    try {
      if (!shop?.id) {
        setParts([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('parts')
        .select('*, reserved_quantity, price_last_updated', { count: 'exact' })
        .eq('shop_id', shop.id);

      // Server-side search if search term provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        query = query.or(`name.ilike.%${searchLower}%,reference.ilike.%${searchLower}%`);
      }

      // Get paginated data with count in single query
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('name', { ascending: true })
        .range(from, to);

      if (error) throw error;
      
      setParts(data || []);
      setTotalCount(count || 0);
      
      // Fetch statistics in parallel
      fetchStatistics();
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
    setLoading(true);
    fetchParts();
  }, [page, itemsPerPage, searchTerm]);

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
      if (!shop?.id) {
        throw new Error('Shop non trouvé pour cet utilisateur');
      }

      const { data, error } = await supabase
        .from('parts')
        .insert([{ ...partData, shop_id: shop.id, time_minutes: (partData as any).time_minutes ?? 15 }])
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
    totalCount,
    statistics,
    createPart,
    updatePart,
    deletePart,
    updatePartQuantity,
    adjustStock,
    findSimilarParts,
    refetch: fetchParts,
  };
}