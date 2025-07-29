import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupportTicket {
  id: string;
  shop_id: string;
  created_by: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  shop?: {
    name: string;
    email?: string;
  };
  creator?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'shop' | 'admin';
  message: string;
  created_at: string;
  read_by_shop: boolean;
  read_by_admin: boolean;
  sender?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export function useSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          shop:shops(name, email),
          creator:profiles!support_tickets_created_by_fkey(first_name, last_name, user_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as SupportTicket[]);
    } catch (error: any) {
      console.error('Error fetching support tickets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les tickets de support",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Écouter les mises à jour temps réel des tickets
  useEffect(() => {
    const channel = supabase
      .channel('support-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          console.log('Support ticket change:', payload);
          fetchTickets(); // Rafraîchir la liste
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createTicket = async (ticketData: {
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }) => {
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
        .from('support_tickets')
        .insert([{
          ...ticketData,
          shop_id: profile.shop_id,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Ticket créé",
        description: "Votre ticket de support a été créé avec succès",
      });

      fetchTickets();
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

  const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: "Le statut du ticket a été mis à jour",
      });

      fetchTickets();
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

  const assignTicket = async (ticketId: string, userId: string | null) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ assigned_to: userId })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Ticket assigné",
        description: "Le ticket a été assigné avec succès",
      });

      fetchTickets();
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
    tickets,
    loading,
    createTicket,
    updateTicketStatus,
    assignTicket,
    refetch: fetchTickets,
  };
}