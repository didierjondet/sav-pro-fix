import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PartDiscountInfo } from '@/components/ui/part-discount-manager';

export interface QuoteItem {
  part_id: string;
  part_name: string;
  part_reference?: string;
  quantity: number;
  unit_public_price: number; // Prix public (vente)
  unit_purchase_price: number; // Prix d'achat (coût)
  total_price: number;
  discount?: PartDiscountInfo | null; // Remise appliquée à cette pièce
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
  deposit_amount?: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'completed' | 'archived';
  shop_id: string;
  created_at: string;
  updated_at: string;
  sms_sent_at?: string | null;
  accepted_by?: 'shop' | 'client' | null;
  accepted_at?: string | null;
  sav_case_id?: string | null;
}

export function useQuotes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchQuotes = async (): Promise<Quote[]> => {
    if (!user) return [];

    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.shop_id) {
        console.error('No shop_id found for current user');
        return [];
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
      
      return parsedData;
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les devis",
        variant: "destructive",
      });
      return [];
    }
  };

  const { data: quotes = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['quotes', user?.id],
    queryFn: fetchQuotes,
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes - données dynamiques
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (!user) return;

    // Set up real-time listener for quotes
    const channel = supabase
      .channel('quotes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes'
        },
        (payload) => {
          console.log('📋 Quote change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['quotes'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

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

      refetch();
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

      refetch();
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

      refetch();
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

  const archiveQuote = async (quoteId: string) => {
    try {
      // Récupérer le devis pour connaître les pièces réservées
      const quote = quotes.find(q => q.id === quoteId);
      if (!quote) {
        throw new Error('Devis non trouvé');
      }

      // Libérer les pièces réservées si elles existent
      if (quote.items && quote.items.length > 0) {
        const validParts = quote.items.filter(item => 
          item.part_id && item.part_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        );

        for (const item of validParts) {
          // Libérer la quantité réservée
          const { data: currentPart, error: fetchError } = await supabase
            .from('parts')
            .select('reserved_quantity')
            .eq('id', item.part_id)
            .single();

          if (fetchError) {
            console.error('Erreur lors de la récupération des pièces:', fetchError);
            continue;
          }

          const newReservedQuantity = Math.max(0, (currentPart.reserved_quantity || 0) - item.quantity);
          
          const { error: releaseError } = await supabase
            .from('parts')
            .update({
              reserved_quantity: newReservedQuantity
            })
            .eq('id', item.part_id);

          if (releaseError) {
            console.error('Erreur lors de la libération des pièces:', releaseError);
          }
        }
      }

      // Archiver le devis
      const { error } = await supabase
        .from('quotes' as any)
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Devis archivé avec succès",
      });

      refetch();
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

  const reactivateQuote = async (quoteId: string, previousStatus: Quote['status']) => {
    try {
      // Récupérer le devis pour connaître les pièces à re-réserver
      const quote = quotes.find(q => q.id === quoteId);
      if (!quote) {
        throw new Error('Devis non trouvé');
      }

      // Re-réserver les pièces si nécessaire
      if (quote.items && quote.items.length > 0) {
        const validParts = quote.items.filter(item => 
          item.part_id && item.part_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        );

        for (const item of validParts) {
          // Vérifier le stock disponible
          const { data: partData, error: stockError } = await supabase
            .from('parts')
            .select('quantity, reserved_quantity')
            .eq('id', item.part_id)
            .single();

          if (stockError) {
            console.error('Erreur lors de la vérification du stock:', stockError);
            continue;
          }

          const availableStock = (partData.quantity || 0) - (partData.reserved_quantity || 0);
          
          if (availableStock >= item.quantity) {
            // Re-réserver la quantité
            const newReservedQuantity = (partData.reserved_quantity || 0) + item.quantity;
            const { error: reserveError } = await supabase
              .from('parts')
              .update({
                reserved_quantity: newReservedQuantity
              })
              .eq('id', item.part_id);

            if (reserveError) {
              console.error('Erreur lors de la réservation des pièces:', reserveError);
            }
          } else {
            // Stock insuffisant, avertir l'utilisateur mais continuer
            toast({
              title: "Attention",
              description: `Stock insuffisant pour la pièce ${item.part_name}. Quantité disponible: ${availableStock}, demandée: ${item.quantity}`,
              variant: "destructive",
            });
          }
        }
      }

      // Réactiver le devis avec son ancien statut
      const statusToRestore = previousStatus === 'archived' ? 'draft' : previousStatus;
      
      const { error } = await supabase
        .from('quotes' as any)
        .update({ 
          status: statusToRestore,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Devis réactivé avec succès",
      });

      refetch();
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
    archiveQuote,
    reactivateQuote,
    refetch,
  };
}