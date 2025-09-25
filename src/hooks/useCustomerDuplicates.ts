import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/hooks/useCustomers';

interface DuplicateGroup {
  customers: Customer[];
  similarity: 'name' | 'email' | 'phone';
  reason: string;
}

export function useCustomerDuplicates() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const findDuplicates = async (customers: Customer[]): Promise<DuplicateGroup[]> => {
    const duplicateGroups: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (const customer of customers) {
      if (processed.has(customer.id)) continue;

      const duplicatesFound: Customer[] = [];
      
      // Recherche par nom complet
      const nameMatches = customers.filter(c => 
        c.id !== customer.id &&
        !processed.has(c.id) &&
        c.first_name.toLowerCase().trim() === customer.first_name.toLowerCase().trim() &&
        c.last_name.toLowerCase().trim() === customer.last_name.toLowerCase().trim()
      );

      // Recherche par email (si présent)
      const emailMatches = customers.filter(c => 
        c.id !== customer.id &&
        !processed.has(c.id) &&
        customer.email && c.email &&
        c.email.toLowerCase().trim() === customer.email.toLowerCase().trim()
      );

      // Recherche par téléphone (si présent)
      const phoneMatches = customers.filter(c => 
        c.id !== customer.id &&
        !processed.has(c.id) &&
        customer.phone && c.phone &&
        c.phone.replace(/\s/g, '') === customer.phone.replace(/\s/g, '')
      );

      if (nameMatches.length > 0) {
        duplicatesFound.push(...nameMatches);
        duplicateGroups.push({
          customers: [customer, ...nameMatches],
          similarity: 'name',
          reason: `Même nom: ${customer.first_name} ${customer.last_name}`
        });
        
        // Marquer comme traités
        processed.add(customer.id);
        nameMatches.forEach(c => processed.add(c.id));
      } else if (emailMatches.length > 0) {
        duplicatesFound.push(...emailMatches);
        duplicateGroups.push({
          customers: [customer, ...emailMatches],
          similarity: 'email',
          reason: `Même email: ${customer.email}`
        });
        
        processed.add(customer.id);
        emailMatches.forEach(c => processed.add(c.id));
      } else if (phoneMatches.length > 0) {
        duplicatesFound.push(...phoneMatches);
        duplicateGroups.push({
          customers: [customer, ...phoneMatches],
          similarity: 'phone',
          reason: `Même téléphone: ${customer.phone}`
        });
        
        processed.add(customer.id);
        phoneMatches.forEach(c => processed.add(c.id));
      }
    }

    return duplicateGroups;
  };

  const detectDuplicates = async (customers: Customer[]) => {
    setLoading(true);
    try {
      const duplicateGroups = await findDuplicates(customers);
      setDuplicates(duplicateGroups);
      
      if (duplicateGroups.length === 0) {
        toast({
          title: "Aucun doublon détecté",
          description: "Tous vos clients semblent uniques.",
        });
      } else {
        toast({
          title: "Doublons détectés",
          description: `${duplicateGroups.length} groupe(s) de doublons trouvé(s).`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de détecter les doublons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const mergeCustomers = async (keepCustomerId: string, mergeCustomerIds: string[]) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop ID not found');
      }

      // 1. Mettre à jour tous les SAV cases
      const { error: savError } = await supabase
        .from('sav_cases')
        .update({ customer_id: keepCustomerId })
        .in('customer_id', mergeCustomerIds)
        .eq('shop_id', profile.shop_id);

      if (savError) throw savError;

      // 2. Mettre à jour tous les devis
      const { error: quotesError } = await supabase
        .from('quotes')
        .update({ customer_id: keepCustomerId })
        .in('customer_id', mergeCustomerIds)
        .eq('shop_id', profile.shop_id);

      if (quotesError) throw quotesError;

      // 3. Supprimer les clients en doublon
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .in('id', mergeCustomerIds)
        .eq('shop_id', profile.shop_id);

      if (deleteError) throw deleteError;

      toast({
        title: "Fusion réussie",
        description: `${mergeCustomerIds.length} client(s) fusionné(s) avec succès.`,
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Erreur lors de la fusion",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  return {
    duplicates,
    loading,
    detectDuplicates,
    mergeCustomers,
    clearDuplicates: () => setDuplicates([])
  };
}