import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLimitDialogContext } from '@/contexts/LimitDialogContext';
import { useAuth } from '@/contexts/AuthContext';

export interface SAVCase {
  id: string;
  case_number: string;
  tracking_slug?: string;
  sav_type: string; // Changé de type hardcodé vers string pour supporter les types dynamiques
  status: string;
  device_brand: string;
  device_model: string;
  device_imei?: string;
  sku?: string;
  problem_description: string;
  repair_notes?: string;
  private_comments?: string;
  technician_comments?: string;
  total_time_minutes: number;
  total_cost: number;
  taken_over: boolean;
  partial_takeover?: boolean;
  takeover_amount?: number;
  created_at: string;
  updated_at: string;
  customer_id?: string;
  technician_id?: string;
  shop_id: string;
  accessories?: {
    charger: boolean;
    case: boolean;
    screen_protector: boolean;
  };
  unlock_pattern?: number[];
  customer?: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export function useSAVCases() {
  const { toast } = useToast();
  const { recheckLimitsAndHideDialog } = useLimitDialogContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchCases = async (): Promise<SAVCase[]> => {
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
        .from('sav_cases')
        .select(`
          *,
          customer:customers(first_name, last_name, email, phone, address),
          updated_by_profile:profiles!sav_cases_updated_by_fkey(first_name, last_name)
        `)
        .eq('shop_id', profile.shop_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Mapper les anciens statuts vers les nouveaux
      const mappedData = data?.map(item => ({
        ...item,
        status: item.status === 'delivered' ? 'ready' : item.status,
        accessories: item.accessories as SAVCase['accessories'],
        unlock_pattern: item.unlock_pattern as number[]
      })) as SAVCase[];
      
      return mappedData || [];
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les dossiers SAV",
        variant: "destructive",
      });
      return [];
    }
  };

  const { data: cases = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['sav-cases', user?.id],
    queryFn: fetchCases,
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute - réduit pour synchronisation
    gcTime: 5 * 60 * 1000, // 5 minutes - réduit pour libérer mémoire
    refetchInterval: (data) => {
      // Si sur page /new-sav, ne pas recharger automatiquement
      if (window.location.pathname === '/sav/new') return false;
      // Si page visible, recharger toutes les 2 minutes
      // Si page cachée, ne pas recharger (économise ressources)
      return document.visibilityState === 'visible' ? 2 * 60 * 1000 : false;
    },
  });

  // Listener Realtime déplacé vers RealtimeProvider global pour être actif partout
  // Plus besoin de listener local ici

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

      refetch();
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

  const updateCaseStatus = async (caseId: string, status: string, notes?: string) => {
    try {
      // Si le statut est "cancelled", supprimer définitivement le SAV
      if (status === 'cancelled') {
        await deleteCase(caseId);
        return;
      }

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

      refetch();
      
      // Re-vérifier les limites après changement de statut (cas d'un statut qui libère un SAV actif)
      if (status === 'ready') {
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

      refetch();
      
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

  const updateTechnicianComments = async (caseId: string, comments: string) => {
    try {
      const { error } = await supabase
        .from('sav_cases')
        .update({ technician_comments: comments })
        .eq('id', caseId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Commentaires technicien mis à jour",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updatePrivateComments = async (caseId: string, comments: string) => {
    try {
      const { error } = await supabase
        .from('sav_cases')
        .update({ private_comments: comments })
        .eq('id', caseId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Commentaires privés sauvegardés",
      });

      refetch();
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
    updateTechnicianComments,
    updatePrivateComments,
    deleteCase,
    refetch,
  };
}