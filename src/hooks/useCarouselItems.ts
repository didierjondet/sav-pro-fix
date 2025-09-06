import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CarouselItem {
  id: string;
  title: string;
  description?: string;
  media_url: string;
  file_url?: string;
  media_type: 'image' | 'video';
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to get the effective media URL (file_url takes priority)
export const getEffectiveMediaUrl = (item: CarouselItem): string => {
  return item.file_url || item.media_url;
};

export function useCarouselItems() {
  const { toast } = useToast();
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('carousel_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      setItems((data || []) as CarouselItem[]);
    } catch (error: any) {
      console.error('Error fetching carousel items:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les éléments du carrousel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('carousel_items')
        .select('*')
        .order('display_order');

      if (error) throw error;

      setItems((data || []) as CarouselItem[]);
    } catch (error: any) {
      console.error('Error fetching all carousel items:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les éléments du carrousel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createItem = async (item: Omit<CarouselItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('carousel_items')
        .insert([item])
        .select()
        .single();

      if (error) throw error;

      setItems(prev => [...prev, data as CarouselItem].sort((a, b) => a.display_order - b.display_order));
      
      toast({
        title: "Succès",
        description: "Élément du carrousel créé avec succès",
      });

      return data as CarouselItem;
    } catch (error: any) {
      console.error('Error creating carousel item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'élément du carrousel",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateItem = async (id: string, updates: Partial<CarouselItem>) => {
    try {
      const { data, error } = await supabase
        .from('carousel_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setItems(prev => 
        prev.map(item => item.id === id ? data as CarouselItem : item)
          .sort((a, b) => a.display_order - b.display_order)
      );
      
      toast({
        title: "Succès",
        description: "Élément du carrousel mis à jour avec succès",
      });

      return data as CarouselItem;
    } catch (error: any) {
      console.error('Error updating carousel item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'élément du carrousel",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('carousel_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: "Succès",
        description: "Élément du carrousel supprimé avec succès",
      });
    } catch (error: any) {
      console.error('Error deleting carousel item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément du carrousel",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    items,
    loading,
    fetchItems,
    fetchAllItems,
    createItem,
    updateItem,
    deleteItem,
    refetch: fetchItems
  };
}