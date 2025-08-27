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
  const [partsNeededForSAV, setPartsNeededForSAV] = useState<OrderItemWithPart[]>([]);
  const [partsNeededForQuotes, setPartsNeededForQuotes] = useState<OrderItemWithPart[]>([]);
  const [partsNeedingRestock, setPartsNeedingRestock] = useState<OrderItemWithPart[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrderItems = async () => {
    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        console.error('No shop_id found for current user');
        setOrderItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          part:parts(*)
        `)
        .eq('shop_id', profile.shop_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrderItems((data as OrderItemWithPart[]) || []);
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

  const fetchPartsNeededForSAV = async () => {
    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        setPartsNeededForSAV([]);
        return;
      }

      // Récupérer les pièces utilisées dans les SAV en cours qui ne sont pas en stock
      const { data: savParts, error: savError } = await supabase
        .from('sav_parts')
        .select(`
          part_id,
          quantity,
          sav_case_id,
          parts!inner(*)
        `)
        .eq('parts.quantity', 0)
        .eq('parts.shop_id', profile.shop_id); // Filtrer par shop_id

      if (savError) throw savError;

      // Récupérer les items déjà commandés pour éviter les doublons
      const { data: existingOrders } = await supabase
        .from('order_items')
        .select('part_id, sav_case_id, ordered')
        .eq('reason', 'sav_stock_zero')
        .eq('ordered', true)
        .eq('shop_id', profile.shop_id);

      const formattedSavParts = savParts?.filter(item => {
        // Vérifier si cette combinaison part_id + sav_case_id n'a pas déjà été commandée
        const alreadyOrdered = existingOrders?.some(order => 
          order.part_id === item.part_id && 
          order.sav_case_id === item.sav_case_id &&
          order.ordered === true
        );
        return !alreadyOrdered;
      }).map(item => ({
        id: `sav-needed-${item.part_id}`,
        part_id: item.part_id,
        part_name: item.parts.name,
        part_reference: item.parts.reference,
        quantity_needed: item.quantity,
        sav_case_id: item.sav_case_id,
        reason: 'sav_stock_zero' as const,
        priority: 'high' as const,
        ordered: false,
        shop_id: item.parts.shop_id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        part: item.parts as Part
      })) || [];

      setPartsNeededForSAV(formattedSavParts);
    } catch (error: any) {
      console.error('Error fetching SAV parts needed:', error);
    }
  };

  const fetchPartsNeededForQuotes = async () => {
    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        setPartsNeededForQuotes([]);
        return;
      }

      // Récupérer les pièces dans les devis dont le stock est insuffisant
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, items')
        .eq('status', 'draft')
        .eq('shop_id', profile.shop_id);

      if (quotesError) throw quotesError;

      // Récupérer les items déjà commandés pour éviter les doublons
      const { data: existingOrders } = await supabase
        .from('order_items')
        .select('part_id, quote_id, ordered')
        .eq('reason', 'quote_needed')
        .eq('ordered', true)
        .eq('shop_id', profile.shop_id);

      const neededParts: OrderItemWithPart[] = [];
      
      for (const quote of quotes || []) {
        const items = typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items;
        
        for (const item of items) {
          // Vérifier si cette combinaison part_id + quote_id n'a pas déjà été commandée
          const alreadyOrdered = existingOrders?.some(order => 
            order.part_id === item.part_id && 
            order.quote_id === quote.id &&
            order.ordered === true
          );

          if (!alreadyOrdered) {
            // Vérifier le stock disponible
            const { data: part, error: partError } = await supabase
              .from('parts')
              .select('*')
              .eq('id', item.part_id)
              .maybeSingle();

            if (!partError && part && part.quantity < item.quantity) {
              neededParts.push({
                id: `quote-needed-${item.part_id}-${quote.id}`,
                part_id: item.part_id,
                part_name: item.part_name,
                part_reference: item.part_reference,
                quantity_needed: item.quantity - part.quantity,
                quote_id: quote.id,
                reason: 'quote_needed',
                priority: 'medium',
                ordered: false,
                shop_id: part.shop_id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                part: part
              });
            }
          }
        }
      }

      setPartsNeededForQuotes(neededParts);
    } catch (error: any) {
      console.error('Error fetching quote parts needed:', error);
    }
  };

  const fetchPartsNeedingRestock = async () => {
    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        setPartsNeedingRestock([]);
        return;
      }

      // Récupérer toutes les pièces et filtrer côté client
      const { data: parts, error } = await supabase
        .from('parts')
        .select('*')
        .eq('shop_id', profile.shop_id);

      if (error) throw error;

      // Récupérer les items déjà commandés pour éviter les doublons
      const { data: existingOrders } = await supabase
        .from('order_items')
        .select('part_id, ordered')
        .eq('reason', 'manual')
        .eq('ordered', true)
        .eq('shop_id', profile.shop_id);

      // Filtrer les pièces qui ont besoin d'être réapprovisionnées
      const partsNeedingStock = parts?.filter(part => {
        const needsRestock = part.quantity < part.min_stock;
        // Vérifier si cette pièce n'a pas déjà été commandée
        const alreadyOrdered = existingOrders?.some(order => 
          order.part_id === part.id && order.ordered === true
        );
        return needsRestock && !alreadyOrdered;
      }) || [];

      const restockNeeded = partsNeedingStock.map(part => ({
        id: `restock-${part.id}`,
        part_id: part.id,
        part_name: part.name,
        part_reference: part.reference,
        quantity_needed: part.min_stock - part.quantity,
        reason: 'manual' as const,
        priority: 'low' as const,
        ordered: false,
        shop_id: part.shop_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        part: part
      }));

      console.log('Parts needing restock:', restockNeeded.length);
      setPartsNeedingRestock(restockNeeded);
    } catch (error: any) {
      console.error('Error fetching parts needing restock:', error);
    }
  };

  useEffect(() => {
    fetchOrderItems();
    fetchPartsNeededForSAV();
    fetchPartsNeededForQuotes();
    fetchPartsNeedingRestock();
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
          .from('order_items')
          .update({
            quantity_needed: existingItem.quantity_needed + orderData.quantity_needed,
            priority: orderData.priority 
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Create new item
        const { data, error } = await supabase
          .from('order_items')
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
      // Vérifier si c'est un item généré dynamiquement
      if (itemId.startsWith('sav-needed-') || itemId.startsWith('quote-needed-') || itemId.startsWith('restock-')) {
        // Pour les items virtuels, on doit d'abord les créer dans order_items
        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (!profile?.shop_id) {
          throw new Error('Shop non trouvé');
        }

        // Trouver l'item virtuel dans les données
        let virtualItem: OrderItemWithPart | undefined;
        
        if (itemId.startsWith('sav-needed-')) {
          virtualItem = partsNeededForSAV.find(item => item.id === itemId);
        } else if (itemId.startsWith('quote-needed-')) {
          virtualItem = partsNeededForQuotes.find(item => item.id === itemId);
        } else if (itemId.startsWith('restock-')) {
          virtualItem = partsNeedingRestock.find(item => item.id === itemId);
        }

        if (!virtualItem) {
          throw new Error('Item non trouvé');
        }

        // Créer l'item dans order_items avec ordered: true
        const { error: createError } = await supabase
          .from('order_items')
          .insert([{
            part_id: virtualItem.part_id,
            part_name: virtualItem.part_name,
            part_reference: virtualItem.part_reference,
            quantity_needed: virtualItem.quantity_needed,
            sav_case_id: virtualItem.sav_case_id,
            quote_id: virtualItem.quote_id,
            reason: virtualItem.reason,
            priority: virtualItem.priority,
            shop_id: profile.shop_id,
            ordered: true
          }]);

        if (createError) throw createError;

        // Si c'est un SAV qui a des pièces commandées, mettre à jour le statut du SAV
        if (virtualItem.sav_case_id && itemId.startsWith('sav-needed-')) {
          const { error: updateSAVError } = await supabase
            .from('sav_cases')
            .update({ status: 'parts_ordered' })
            .eq('id', virtualItem.sav_case_id);

          if (updateSAVError) {
            console.error('Erreur lors de la mise à jour du statut SAV:', updateSAVError);
          }
        }
      } else {
        // Pour les vrais items de order_items
        const { error } = await supabase
          .from('order_items')
          .update({ ordered: true })
          .eq('id', itemId);

        if (error) throw error;

        // Récupérer l'item pour voir si c'est lié à un SAV
        const { data: orderItem } = await supabase
          .from('order_items')
          .select('sav_case_id')
          .eq('id', itemId)
          .single();

        // Si c'est lié à un SAV, mettre à jour son statut
        if (orderItem?.sav_case_id) {
          const { error: updateSAVError } = await supabase
            .from('sav_cases')
            .update({ status: 'parts_ordered' })
            .eq('id', orderItem.sav_case_id);

          if (updateSAVError) {
            console.error('Erreur lors de la mise à jour du statut SAV:', updateSAVError);
          }
        }
      }

      toast({
        title: "Succès",
        description: "Article marqué comme commandé",
      });

      // Refetch toutes les données pour mettre à jour l'affichage
      fetchOrderItems();
      fetchPartsNeededForSAV();
      fetchPartsNeededForQuotes();
      fetchPartsNeedingRestock();
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
      // Vérifier si c'est un item généré dynamiquement
      if (itemId.startsWith('sav-needed-') || itemId.startsWith('quote-needed-') || itemId.startsWith('restock-')) {
        // Pour les items virtuels, on les retire simplement de l'affichage
        // (ils se régénéreront au prochain fetch si nécessaire)
        
        if (itemId.startsWith('sav-needed-')) {
          // Pour SAV, on peut potentiellement marquer la pièce comme non nécessaire
          // mais pour l'instant on fait juste un refresh
        } else if (itemId.startsWith('quote-needed-')) {
          // Pour les devis, idem
        } else if (itemId.startsWith('restock-')) {
          // Pour le stock minimum, on pourrait ajuster le stock minimum
          // mais pour l'instant on fait juste un refresh
        }

        toast({
          title: "Succès",
          description: "Article retiré des commandes",
        });

        // Refetch toutes les données pour mettre à jour l'affichage
        fetchPartsNeededForSAV();
        fetchPartsNeededForQuotes();
        fetchPartsNeedingRestock();
      } else {
        // Pour les vrais items de order_items
        const { error } = await supabase
          .from('order_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Article retiré des commandes",
        });

        fetchOrderItems();
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getOrdersByFilter = (filter: 'all' | 'sav' | 'quotes') => {
    switch (filter) {
      case 'sav':
        return partsNeededForSAV;
      case 'quotes':
        return partsNeededForQuotes;
      case 'all':
        return partsNeedingRestock;
      default:
        return [];
    }
  };

  const refreshAllData = () => {
    fetchOrderItems();
    fetchPartsNeededForSAV();
    fetchPartsNeededForQuotes();
    fetchPartsNeedingRestock();
  };

  const receiveOrderItem = async (itemId: string, quantityReceived: number) => {
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

      // Récupérer l'item de commande
      const { data: orderItem, error: fetchError } = await supabase
        .from('order_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError || !orderItem) {
        throw new Error('Commande non trouvée');
      }

      // Mettre à jour le stock de la pièce
      if (orderItem.part_id) {
        const { error: stockError } = await supabase
          .rpc('update_part_quantity', {
            part_id: orderItem.part_id,
            quantity_to_add: quantityReceived
          });

        if (stockError) {
          // Fallback si la fonction n'existe pas
          const { data: currentPart } = await supabase
            .from('parts')
            .select('quantity')
            .eq('id', orderItem.part_id)
            .single();

          const { error: stockUpdateError } = await supabase
            .from('parts')
            .update({ 
              quantity: (currentPart?.quantity || 0) + quantityReceived
            })
            .eq('id', orderItem.part_id);

          if (stockUpdateError) throw stockUpdateError;
        }
      }

      // Supprimer l'item de commande (réception terminée)
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      // Si lié à un SAV, mettre à jour le statut et envoyer un message
      if (orderItem.sav_case_id) {
        // Mettre à jour le statut du SAV
        const { error: savUpdateError } = await supabase
          .from('sav_cases')
          .update({ status: 'parts_received' })
          .eq('id', orderItem.sav_case_id);

        if (savUpdateError) {
          console.error('Erreur lors de la mise à jour du statut SAV:', savUpdateError);
        }

        // Récupérer les informations du shop pour le message
        const { data: shop, error: shopError } = await supabase
          .from('shops')
          .select('name')
          .eq('id', profile.shop_id)
          .single();

        // Envoyer un message automatique dans le chat du SAV
        const { error: messageError } = await supabase
          .from('sav_messages')
          .insert({
            sav_case_id: orderItem.sav_case_id,
            shop_id: profile.shop_id,
            sender_type: 'shop',
            sender_name: shop?.name || 'Atelier',
            message: quantityReceived === 1 
              ? "Nous venons de recevoir votre pièce, votre SAV va pouvoir avancer, on vous tient au courant !"
              : "Nous venons de recevoir vos pièces, votre SAV va pouvoir avancer, on vous tient au courant !",
            read_by_shop: true,
            read_by_client: false
          });

        if (messageError) {
          console.error('Erreur lors de l\'envoi du message automatique:', messageError);
        }
      }

      toast({
        title: "Succès",
        description: `Réception validée : ${quantityReceived} pièce(s) reçue(s)`,
      });

      // Refetch toutes les données pour mettre à jour l'affichage
      refreshAllData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    orderItems,
    partsNeededForSAV,
    partsNeededForQuotes,
    partsNeedingRestock,
    loading,
    addToOrder,
    markAsOrdered,
    removeFromOrder,
    receiveOrderItem,
    getOrdersByFilter,
    refetch: refreshAllData,
  };
}