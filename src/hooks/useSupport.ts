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
      // Get current user info
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('No authenticated user found');
        setTickets([]);
        return;
      }

      // Get current user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id, role')
        .eq('user_id', user.id)
        .single();

      if (!profile?.shop_id) {
        console.error('No shop_id found for current user');
        setTickets([]);
        return;
      }

      // Super admins can see all tickets, regular users only their shop's tickets
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          shop:shops(name, email)
        `)
        .order('created_at', { ascending: false });

      // If not super admin, filter by shop_id
      if (profile.role !== 'super_admin') {
        query = query.eq('shop_id', profile.shop_id);
      }

      const { data, error } = await query;

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
      console.log('Creating ticket with data:', ticketData);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('User error:', userError);
        throw new Error('Erreur d\'authentification');
      }
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }
      
      console.log('Current user:', user.id);

      // Get current user's shop_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      console.log('Profile query result:', { profile, profileError });

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Erreur lors de la récupération du profil');
      }

      if (!profile?.shop_id) {
        throw new Error('Shop non trouvé pour cet utilisateur');
      }

      console.log('Shop ID found:', profile.shop_id);

      const ticketInsert = {
        ...ticketData,
        shop_id: profile.shop_id,
        created_by: user.id
      };

      console.log('Inserting ticket:', ticketInsert);

      const { data, error } = await supabase
        .from('support_tickets')
        .insert([ticketInsert])
        .select()
        .single();

      console.log('Insert result:', { data, error });

      if (error) throw error;

      toast({
        title: "Ticket créé",
        description: "Votre ticket de support a été créé avec succès",
      });

      fetchTickets();
      return { data, error: null };
    } catch (error: any) {
      console.error('Create ticket error:', error);
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

  const deleteTicket = async (ticketId: string) => {
    try {
      // Supprimer d'abord tous les messages associés au ticket
      const { error: messagesError } = await supabase
        .from('support_messages')
        .delete()
        .eq('ticket_id', ticketId);

      if (messagesError) throw messagesError;

      // Puis supprimer le ticket
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Ticket supprimé",
        description: "Le ticket de support a été supprimé avec succès",
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
    deleteTicket,
    refetch: fetchTickets,
  };
}