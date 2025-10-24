import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  shop_id: string;
  created_at: string;
  updated_at: string;
}

export function useCustomers(page: number = 1, itemsPerPage: number = 10, searchTerm: string = '') {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const { shop } = useShop();

  const fetchCustomers = async () => {
    try {
      if (!shop?.id) {
        setCustomers([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('shop_id', shop.id);

      // Server-side search if search term provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        query = query.or(`first_name.ilike.%${searchLower}%,last_name.ilike.%${searchLower}%,email.ilike.%${searchLower}%,phone.ilike.%${searchLower}%`);
      }

      // Get paginated data with count in single query
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setCustomers(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCustomers();
  }, [page, itemsPerPage, searchTerm]);

  const createCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Vérification des doublons
      const { data: existingCustomers, error: searchError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email')
        .eq('shop_id', customerData.shop_id);

      if (searchError) throw searchError;

      // Vérifier si un client avec le même nom et prénom existe déjà
      const nameMatch = existingCustomers?.find(customer => 
        customer.first_name.toLowerCase().trim() === customerData.first_name.toLowerCase().trim() &&
        customer.last_name.toLowerCase().trim() === customerData.last_name.toLowerCase().trim()
      );

      if (nameMatch) {
        toast({
          title: "Client déjà existant",
          description: `Un client avec le nom "${customerData.first_name} ${customerData.last_name}" existe déjà.`,
          variant: "destructive",
        });
        return { data: null, error: new Error("Client déjà existant") };
      }

      // Si un email est fourni, vérifier s'il existe déjà
      if (customerData.email && customerData.email.trim()) {
        const emailMatch = existingCustomers?.find(customer => 
          customer.email && customer.email.toLowerCase().trim() === customerData.email!.toLowerCase().trim()
        );

        if (emailMatch) {
          toast({
            title: "Email déjà utilisé",
            description: `Un client avec l'email "${customerData.email}" existe déjà.`,
            variant: "destructive",
          });
          return { data: null, error: new Error("Email déjà utilisé") };
        }
      }

      // Si aucun doublon détecté, créer le client
      const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Client créé avec succès",
      });

      fetchCustomers();
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

  const updateCustomer = async (customerId: string, customerData: Partial<Customer>) => {
    try {
      // Déterminer le shop_id à partir du client actuel (évite la dépendance à customerData.shop_id)
      const current = customers.find((c) => c.id === customerId);
      let shopId = current?.shop_id as string | undefined;
      if (!shopId) {
        const { data: currentCustomer, error: fetchError } = await supabase
          .from('customers')
          .select('shop_id')
          .eq('id', customerId)
          .single();
        if (fetchError) throw fetchError;
        shopId = currentCustomer?.shop_id as string | undefined;
      }

      // Vérification des doublons lors de la modification
      if (customerData.first_name || customerData.last_name || customerData.email) {
        const { data: existingCustomers, error: searchError } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email')
          .eq('shop_id', shopId as string)
          .neq('id', customerId); // Exclure le client actuel

        if (searchError) throw searchError;

        // Vérifier si un autre client avec le même nom et prénom existe
        if (customerData.first_name && customerData.last_name) {
          const nameMatch = existingCustomers?.find(customer => 
            customer.first_name.toLowerCase().trim() === customerData.first_name!.toLowerCase().trim() &&
            customer.last_name.toLowerCase().trim() === customerData.last_name!.toLowerCase().trim()
          );

          if (nameMatch) {
            toast({
              title: "Client déjà existant",
              description: `Un autre client avec le nom "${customerData.first_name} ${customerData.last_name}" existe déjà.`,
              variant: "destructive",
            });
            return { data: null, error: new Error("Client déjà existant") };
          }
        }

        // Si un email est fourni, vérifier s'il existe déjà chez un autre client
        if (customerData.email && customerData.email.trim()) {
          const emailMatch = existingCustomers?.find(customer => 
            customer.email && customer.email.toLowerCase().trim() === customerData.email!.toLowerCase().trim()
          );

          if (emailMatch) {
            toast({
              title: "Email déjà utilisé",
              description: `Un autre client avec l'email "${customerData.email}" existe déjà.`,
              variant: "destructive",
            });
            return { data: null, error: new Error("Email déjà utilisé") };
          }
        }
      }

      // Si aucun doublon détecté, mettre à jour le client
      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', customerId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Client mis à jour avec succès",
      });

      fetchCustomers();
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

  const deleteCustomer = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Client supprimé avec succès",
      });

      fetchCustomers();
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
    customers,
    loading,
    totalCount,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refetch: fetchCustomers,
  };
}