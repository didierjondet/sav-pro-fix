import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLimitDialogContext } from '@/contexts/LimitDialogContext';

export interface SAVCase {
  id: string;
  case_number: string;
  tracking_slug?: string;
  sav_type: 'client' | 'internal' | 'external';
  status: 'pending' | 'in_progress' | 'testing' | 'parts_ordered' | 'ready' | 'cancelled';
  device_brand: string;
  device_model: string;
  device_imei?: string;
  sku?: string;
  problem_description: string;
  repair_notes?: string;
  private_comments?: string;
  total_time_minutes: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
  customer_id?: string;
  technician_id?: string;
  shop_id: string;
  customer?: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export function useSAVCases() {
  const [cases, setCases] = useState<SAVCase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { recheckLimitsAndHideDialog } = useLimitDialogContext();

  const fetchCases = async () => {
    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        console.error('No shop_id found for current user');
        setCases([]);
        return;
      }

      const { data, error } = await supabase
        .from('sav_cases')
        .select(`
          *,
          customer:customers(first_name, last_name, email, phone, address)
        `)
        .eq('shop_id', profile.shop_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Mapper les anciens statuts vers les nouveaux
      const mappedData = data?.map(item => ({
        ...item,
        status: item.status === 'delivered' ? 'ready' : item.status
      })) as SAVCase[];
      
      setCases(mappedData || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les dossiers SAV",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();

    // Set up realtime listener for SAV cases
    const channel = supabase
      .channel('sav-cases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sav_cases'
        },
        (payload) => {
          console.log('SAV case change detected:', payload);
          fetchCases(); // Refetch all cases when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createCase = async (caseData: any) => {
    try {
      const { data, error } = await supabase
        .from('sav_cases')
        .insert([caseData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Dossier SAV créé avec succès",
      });

      fetchCases();
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

  const updateCaseStatus = async (caseId: string, status: SAVCase['status'], notes?: string) => {
    try {
      const { error } = await supabase
        .from('sav_cases')
        .update({ status, repair_notes: notes })
        .eq('id', caseId);

      if (error) throw error;

      // Add to status history
      await supabase
        .from('sav_status_history')
        .insert({
          sav_case_id: caseId,
          status,
          notes,
        });

      toast({
        title: "Succès",
        description: "Statut mis à jour avec succès",
      });

      fetchCases();
      
      // Re-vérifier les limites après changement de statut (cas d'un statut qui libère un SAV actif)
      if (status === 'ready' || status === 'cancelled') {
        setTimeout(() => {
          recheckLimitsAndHideDialog();
        }, 500);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteCase = async (caseId: string) => {
    try {
      const { error } = await supabase
        .from('sav_cases')
        .delete()
        .eq('id', caseId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Dossier SAV supprimé avec succès",
      });

      fetchCases();
      
      // Re-vérifier les limites après suppression
      setTimeout(() => {
        recheckLimitsAndHideDialog();
      }, 500); // Petit délai pour que la DB soit mise à jour
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    cases,
    loading,
    createCase,
    updateCaseStatus,
    deleteCase,
    refetch: fetchCases,
  };
}