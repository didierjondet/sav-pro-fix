import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Part } from '@/hooks/useParts';

export interface OrderItem {
  id: string;
  part_id: string;
  part_name: string;
  part_reference?: string;
  quantity_needed: number;
  sav_case_id?: string;
  quote_id?: string;
  reason: 'sav_stock_zero' | 'quote_needed' | 'manual';
  priority: 'low' | 'medium' | 'high';
  ordered: boolean;
  shop_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItemWithPart extends OrderItem {
  part?: Part;
}

export function useOrders() {
  const [orderItems, setOrderItems] = useState<OrderItemWithPart[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrderItems = async () => {
    try {
      const { data, error } = await supabase
        .from('order_items' as any)
        .select(`
          *,
          part:parts(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error: any) {
      console.error('Error fetching order items:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderItems();
  }, []);

  const addToOrder = async (orderData: Omit<OrderItem, 'id' | 'created_at' | 'updated_at' | 'shop_id' | 'ordered'>) => {
    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop non trouvé');
      }

      // Check if item already exists
      const existingItem = orderItems.find(
        item => item.part_id === orderData.part_id && 
               item.sav_case_id === orderData.sav_case_id &&
               !item.ordered
      );

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from('order_items' as any)
          .update({ 
            quantity_needed: existingItem.quantity_needed + orderData.quantity_needed,
            priority: orderData.priority 
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Create new item
        const { data, error } = await supabase
          .from('order_items' as any)
          .insert([{
            ...orderData,
            shop_id: profile.shop_id,
            ordered: false
          }])
          .select()
          .single();

        if (error) throw error;
      }

      fetchOrderItems();
      return { error: null };
    } catch (error: any) {
      console.error('Error adding to order:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const markAsOrdered = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('order_items' as any)
        .update({ ordered: true })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Article marqué comme commandé",
      });

      fetchOrderItems();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeFromOrder = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('order_items' as any)
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Article retiré des commandes",
      });

      fetchOrderItems();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getOrdersByFilter = (filter: 'all' | 'sav' | 'quotes' | 'pending') => {
    return orderItems.filter(item => {
      if (filter === 'all') return true;
      if (filter === 'sav') return item.reason === 'sav_stock_zero';
      if (filter === 'quotes') return item.reason === 'quote_needed';
      if (filter === 'pending') return !item.ordered;
      return true;
    });
  };

  return {
    orderItems,
    loading,
    addToOrder,
    markAsOrdered,
    removeFromOrder,
    getOrdersByFilter,
    refetch: fetchOrderItems,
  };
}