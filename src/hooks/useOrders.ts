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
  sav_customer_name?: string;
  sav_type?: string;
  sav_type_color?: string;
  sav_type_label?: string;
  sav_cases?: {
    status: string;
  };
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
          part:parts(*),
          sav_cases(status)
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

      // Récupérer les pièces utilisées dans les SAV en cours
      const { data: savParts, error: savError } = await supabase
        .from('sav_parts')
        .select(`
          part_id,
          quantity,
          sav_case_id,
          parts!inner(*),
          sav_cases!inner(
            customer_id,
            sav_type,
            shop_id,
            status,
            created_at,
            customers(first_name, last_name)
          )
        `)
        .eq('parts.shop_id', profile.shop_id)
        .in('sav_cases.status', ['pending', 'in_progress', 'parts_to_order', 'parts_ordered', 'testing']);

      if (savError) throw savError;

      // Récupérer les types SAV du shop pour les couleurs
      const { data: savTypes } = await supabase
        .from('shop_sav_types')
        .select('type_key, type_color, type_label')
        .eq('shop_id', profile.shop_id)
        .eq('is_active', true);

      if (savError) throw savError;

      // Récupérer les items déjà commandés pour éviter les doublons
      const { data: existingOrders } = await supabase
        .from('order_items')
        .select('part_id, sav_case_id, ordered')
        .in('reason', ['sav_stock_zero', 'sav_stock_insufficient'])
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
      }).map(item => {
        // Trouver les informations du type SAV
        const savType = savTypes?.find(t => t.type_key === item.sav_cases?.sav_type);
        
        return {
          id: `sav-needed-${item.part_id}-${item.sav_case_id}`,
          part_id: item.part_id,
          part_name: item.parts.name,
          part_reference: item.parts.reference,
          quantity_needed: item.quantity,
          sav_case_id: item.sav_case_id,
          reason: 'sav_stock_zero' as const,
          priority: 'high' as const,
          ordered: false,
          shop_id: item.parts.shop_id || '',
          created_at: item.sav_cases?.created_at || new Date().toISOString(),
          updated_at: item.sav_cases?.created_at || new Date().toISOString(),
          part: item.parts as Part,
          sav_customer_name: item.sav_cases?.customers ? 
            `${item.sav_cases.customers.first_name} ${item.sav_cases.customers.last_name}`.trim() : 
            'Client inconnu',
          sav_type: item.sav_cases?.sav_type || 'internal',
          sav_type_color: savType?.type_color || '#6b7280',
          sav_type_label: savType?.type_label || 'SAV'
        };
      }) || [];

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
        .select('id, items, created_at')
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
              .select('*, price_last_updated')
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
                created_at: quote.created_at || new Date().toISOString(),
                updated_at: quote.created_at || new Date().toISOString(),
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
        .select('*, price_last_updated')
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
        created_at: part.created_at || new Date().toISOString(),
        updated_at: part.updated_at || new Date().toISOString(),
        part: part
      }));

      console.log('Parts needing restock:', restockNeeded.length);
      setPartsNeedingRestock(restockNeeded);
    } catch (error: any) {
      console.error('Error fetching parts needing restock:', error);
    }
  };

  useEffect(() => {
    console.log('🚀 useOrders useEffect starting...');
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('📥 Starting parallel data fetch...');
        await Promise.all([
          fetchOrderItems(),
          fetchPartsNeededForSAV(),
          fetchPartsNeededForQuotes(),
          fetchPartsNeedingRestock()
        ]);
        console.log('✅ All data fetched successfully');
      } catch (error) {
        console.error('❌ Error loading order data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
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
    console.log('🗑️ removeFromOrder appelé avec itemId:', itemId);
    
    try {
      // Vérifier si c'est un item généré dynamiquement
      if (itemId.startsWith('sav-needed-') || itemId.startsWith('quote-needed-') || itemId.startsWith('restock-')) {
        console.log('🔄 Item virtuel détecté:', itemId);
        
        if (itemId.startsWith('sav-needed-')) {
          console.log('📋 Traitement SAV item:', itemId);
          
          const savItem = partsNeededForSAV.find(item => item.id === itemId);
          console.log('📦 SAV item trouvé:', savItem);
          
          if (savItem?.part_id && savItem?.sav_case_id) {
            console.log('🔍 Utilisation des valeurs réelles - partId:', savItem.part_id, 'savCaseId:', savItem.sav_case_id);
            
            // Supprimer la pièce des sav_parts avec les VRAIES valeurs
            const { error: removePartError } = await supabase
              .from('sav_parts')
              .delete()
              .eq('sav_case_id', savItem.sav_case_id)
              .eq('part_id', savItem.part_id);

            if (removePartError) console.error('Erreur suppression sav_parts:', removePartError);

            // Libérer la quantité réservée si elle existe
            if (savItem.part) {
              const newReservedQuantity = Math.max(0, (savItem.part.reserved_quantity || 0) - savItem.quantity_needed);
              const { error: updateStockError } = await supabase
                .from('parts')
                .update({ reserved_quantity: newReservedQuantity })
                .eq('id', savItem.part_id);

              if (updateStockError) console.error('Erreur libération stock réservé:', updateStockError);
            }

            // Vérifier s'il reste des pièces dans le SAV pour ajuster le statut
            const { data: remainingParts } = await supabase
              .from('sav_parts')
              .select('id')
              .eq('sav_case_id', savItem.sav_case_id)
              .limit(1);

            // Si plus aucune pièce, remettre le SAV en "pending"
            if (!remainingParts || remainingParts.length === 0) {
              const { error: statusError } = await supabase
                .from('sav_cases')
                .update({ 
                  status: 'pending',
                  total_cost: 0,
                  total_time_minutes: 0
                })
                .eq('id', savItem.sav_case_id);

              if (statusError) console.error('Erreur mise à jour statut SAV:', statusError);
            } else {
              // Recalculer les totaux du SAV
              const { data: allParts } = await supabase
                .from('sav_parts')
                .select('quantity, unit_price, time_minutes')
                .eq('sav_case_id', savItem.sav_case_id);

              if (allParts) {
                const totalCost = allParts.reduce((sum, p) => sum + (p.quantity * (p.unit_price || 0)), 0);
                const totalTime = allParts.reduce((sum, p) => sum + (p.time_minutes || 0), 0);

                const { error: totalsError } = await supabase
                  .from('sav_cases')
                  .update({ 
                    total_cost: totalCost,
                    total_time_minutes: totalTime
                  })
                  .eq('id', savItem.sav_case_id);

                if (totalsError) console.error('Erreur mise à jour totaux SAV:', totalsError);
              }
            }
          }
        } else if (itemId.startsWith('quote-needed-')) {
          // Pour les devis - libérer les quantités réservées si nécessaire
          const quoteItem = partsNeededForQuotes.find(item => item.id === itemId);
          
          if (quoteItem && quoteItem.part) {
            // Extraire le part_id de l'ID complexe quote-needed-{partId}-{quoteId}
            const partId = quoteItem.part_id;
            
            // Libérer la quantité réservée
            const newReservedQuantity = Math.max(0, (quoteItem.part.reserved_quantity || 0) - quoteItem.quantity_needed);
            const { error: updateStockError } = await supabase
              .from('parts')
              .update({ reserved_quantity: newReservedQuantity })
              .eq('id', partId);

            if (updateStockError) console.error('Erreur libération stock réservé devis:', updateStockError);
          }
         }
        // Pour le stock minimum (restock-), rien de spécial à faire

        // Rafraîchir toutes les données après suppression
        await refreshAllData();
        
        toast({
          title: "Succès",
          description: "Article retiré de la liste",
        });
        
      } else {
        // Pour les vrais items de order_items
        const { data: orderItem } = await supabase
          .from('order_items')
          .select('sav_case_id, part_id, quantity_needed')
          .eq('id', itemId)
          .single();

        // Si c'est lié à un SAV et pas encore commandé, libérer les réservations
        if (orderItem && orderItem.sav_case_id && orderItem.part_id) {
          const { data: part } = await supabase
            .from('parts')
            .select('reserved_quantity')
            .eq('id', orderItem.part_id)
            .single();

          if (part) {
            const newReservedQuantity = Math.max(0, (part.reserved_quantity || 0) - orderItem.quantity_needed);
            await supabase
              .from('parts')
              .update({ reserved_quantity: newReservedQuantity })
              .eq('id', orderItem.part_id);
          }
        }

        const { error } = await supabase
          .from('order_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Article retiré des commandes",
        });

        // Rafraîchir toutes les données
        await refreshAllData();
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getOrdersByFilter = (filter: 'all' | 'sav' | 'quotes' | 'reception') => {
    console.log(`🔍 getOrdersByFilter called with filter: ${filter}`);
    console.log(`📊 orderItems length: ${orderItems.length}`);
    console.log(`📊 partsNeededForSAV length: ${partsNeededForSAV.length}`);
    console.log(`📊 partsNeededForQuotes length: ${partsNeededForQuotes.length}`);
    console.log(`📊 partsNeedingRestock length: ${partsNeedingRestock.length}`);
    
    switch (filter) {
      case 'sav':
        // Ne retourner QUE les items générés dynamiquement pour SAV
        console.log(`🎯 SAV filter - returning partsNeededForSAV:`, partsNeededForSAV.map(p => p.part_name));
        return partsNeededForSAV;
      case 'quotes':
        // Ne retourner QUE les items générés dynamiquement pour devis
        console.log(`🎯 QUOTES filter - returning partsNeededForQuotes:`, partsNeededForQuotes.map(p => p.part_name));
        return partsNeededForQuotes;
      case 'all':
        // Ne retourner QUE les items générés dynamiquement pour stock minimum
        console.log(`🎯 ALL filter - returning partsNeedingRestock:`, partsNeedingRestock.map(p => p.part_name));
        return partsNeedingRestock;
      case 'reception':
        // Seulement les vraies commandes commandées, en excluant les SAV terminés
        const receptionItems = orderItems.filter(item => {
          const isOrdered = item.ordered;
          const isSAVCompleted = item.sav_cases && ['ready', 'delivered', 'cancelled'].includes(item.sav_cases.status);
          return isOrdered && !isSAVCompleted;
        });
        console.log(`🎯 RECEPTION filter - returning ordered items:`, receptionItems.map(p => p.part_name));
        return receptionItems;
      default:
        console.log(`🎯 DEFAULT filter - returning empty array`);
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
        // Récupérer la quantité actuelle
        const { data: currentPart } = await supabase
          .from('parts')
          .select('quantity')
          .eq('id', orderItem.part_id)
          .single();

        // Mettre à jour la quantité
        const { error: stockUpdateError } = await supabase
          .from('parts')
          .update({ 
            quantity: (currentPart?.quantity || 0) + quantityReceived
          })
          .eq('id', orderItem.part_id);

        if (stockUpdateError) throw stockUpdateError;
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
          .update({ status: 'parts_received' as any })
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

  const cancelOrder = async (itemId: string) => {
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

      // Récupérer l'item de commande pour connaître les détails
      const { data: orderItem, error: fetchError } = await supabase
        .from('order_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError || !orderItem) {
        throw new Error('Commande non trouvée');
      }

      // Si la commande est liée à un SAV, libérer les pièces réservées
      if (orderItem.sav_case_id && orderItem.part_id) {
        // Récupérer les pièces SAV liées à cette commande
        const { data: savParts, error: savPartsError } = await supabase
          .from('sav_parts')
          .select('quantity')
          .eq('sav_case_id', orderItem.sav_case_id)
          .eq('part_id', orderItem.part_id);

        if (!savPartsError && savParts && savParts.length > 0) {
          // Calculer la quantité totale à libérer
          const totalQuantityToRelease = savParts.reduce((sum, part) => sum + part.quantity, 0);
          
          // Libérer les quantités réservées dans le stock
          const { data: currentPart, error: partError } = await supabase
            .from('parts')
            .select('reserved_quantity')
            .eq('id', orderItem.part_id)
            .single();

          if (!partError && currentPart) {
            const newReservedQuantity = Math.max(0, currentPart.reserved_quantity - totalQuantityToRelease);
            
            const { error: updatePartError } = await supabase
              .from('parts')
              .update({ reserved_quantity: newReservedQuantity })
              .eq('id', orderItem.part_id);

            if (updatePartError) {
              console.error('Erreur lors de la libération des quantités réservées:', updatePartError);
            }
          }
        }

        // Envoyer un message automatique dans le chat SAV pour informer de l'annulation
        const { data: shop, error: shopError } = await supabase
          .from('shops')
          .select('name')
          .eq('id', profile.shop_id)
          .single();

        const { error: messageError } = await supabase
          .from('sav_messages')
          .insert({
            sav_case_id: orderItem.sav_case_id,
            shop_id: profile.shop_id,
            sender_type: 'shop',
            sender_name: shop?.name || 'Atelier',
            message: `La commande de pièce "${orderItem.part_name}" a été annulée. Nous recherchons une solution alternative pour votre SAV.`,
            read_by_shop: true,
            read_by_client: false
          });

        if (messageError) {
          console.error('Erreur lors de l\'envoi du message d\'annulation:', messageError);
        }
      }

      // Supprimer l'item de commande
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      toast({
        title: "Commande annulée",
        description: "La commande a été annulée et les répercussions ont été appliquées",
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
    cancelOrder,
    getOrdersByFilter,
    refetch: refreshAllData,
  };
}