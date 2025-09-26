import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      console.log('🔍 [DEBUG] Début fetchCustomers');
      
      // Step 1: Get current user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('🔍 [DEBUG] Auth user:', authData?.user?.id, authError);
      
      if (authError || !authData?.user?.id) {
        console.error('❌ [ERROR] Auth failed:', authError);
        setCustomers([]);
        return;
      }

      // Step 2: Get user profile and shop_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', authData.user.id)
        .single();

      console.log('🔍 [DEBUG] Profile data:', profile, profileError);

      if (profileError || !profile?.shop_id) {
        console.error('❌ [ERROR] No shop_id found:', profileError, profile);
        setCustomers([]);
        toast({
          title: "Erreur de configuration",
          description: "Aucun magasin associé à votre compte",
          variant: "destructive",
        });
        return;
      }

      // Step 3: Get customers for this shop
      console.log('🔍 [DEBUG] Fetching customers for shop_id:', profile.shop_id);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .order('created_at', { ascending: false });

      console.log('🔍 [DEBUG] Customers query result:', { count: data?.length, error });

      if (error) throw error;
      
      setCustomers(data || []);
      console.log('✅ [DEBUG] Customers loaded successfully:', data?.length || 0);
      
    } catch (error: any) {
      console.error('❌ [ERROR] fetchCustomers failed:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les clients",
        variant: "destructive",
      });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 [DEBUG] useCustomers useEffect triggered');
    fetchCustomers();
    
    // Force clean any stale React Query cache
    if (typeof window !== 'undefined' && (window as any).queryClient) {
      console.log('🧹 [DEBUG] Clearing React Query cache');
      (window as any).queryClient.clear();
    }
  }, []);

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
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refetch: fetchCustomers,
  };
}