import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SAVProvider {
  id: string;
  shop_id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  specialties?: string | null;
  avg_delay_days?: number | null;
  color: string;
  notes?: string | null;
  is_active: boolean;
  show_in_sidebar: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SAVProviderAssignment {
  id: string;
  shop_id: string;
  sav_case_id: string;
  provider_id: string;
  sent_at: string;
  returned_at?: string | null;
  reason?: string | null;
  external_ref?: string | null;
  cost?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

/** Liste des prestataires techniques du magasin. */
export function useSAVProviders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: providers = [], isLoading, refetch } = useQuery({
    queryKey: ['sav-providers', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<SAVProvider[]> => {
      const { data, error } = await supabase
        .from('shop_sav_providers')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as SAVProvider[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('sav-providers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_sav_providers' }, () => {
        queryClient.invalidateQueries({ queryKey: ['sav-providers'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const getShopId = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('user_id', user!.id)
      .single();
    return data?.shop_id as string | undefined;
  };

  const createProvider = async (values: Partial<SAVProvider>) => {
    try {
      const shopId = await getShopId();
      if (!shopId) throw new Error('Magasin introuvable');
      const { error } = await supabase.from('shop_sav_providers').insert({
        shop_id: shopId,
        name: values.name || 'Prestataire',
        contact_name: values.contact_name || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        specialties: values.specialties || null,
        avg_delay_days: values.avg_delay_days ?? null,
        color: values.color || '#8b5cf6',
        notes: values.notes || null,
        is_active: values.is_active ?? true,
        show_in_sidebar: values.show_in_sidebar ?? true,
        display_order: values.display_order ?? 0,
      });
      if (error) throw error;
      toast({ title: 'Prestataire créé' });
      queryClient.invalidateQueries({ queryKey: ['sav-providers'] });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const updateProvider = async (id: string, updates: Partial<SAVProvider>) => {
    try {
      const { error } = await supabase.from('shop_sav_providers').update(updates).eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['sav-providers'] });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const deleteProvider = async (id: string) => {
    try {
      const { error } = await supabase.from('shop_sav_providers').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Prestataire supprimé' });
      queryClient.invalidateQueries({ queryKey: ['sav-providers'] });
    } catch (e: any) {
      toast({
        title: 'Suppression impossible',
        description: 'Ce prestataire est encore lié à des dossiers SAV. Désactivez-le plutôt.',
        variant: 'destructive',
      });
      throw e;
    }
  };

  return { providers, isLoading, createProvider, updateProvider, deleteProvider, refetch };
}

/** Attributions en cours (non retournées) pour tout le magasin. */
export function useActiveProviderAssignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sav-provider-assignments-active', user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<SAVProviderAssignment[]> => {
      const { data, error } = await supabase
        .from('sav_provider_assignments')
        .select('*')
        .is('returned_at', null);
      if (error) throw error;
      return (data || []) as SAVProviderAssignment[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('sav-provider-assignments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sav_provider_assignments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['sav-provider-assignments-active'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

/** Historique des attributions d'un dossier SAV. */
export function useSAVCaseAssignments(savCaseId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['sav-provider-assignments', savCaseId],
    enabled: !!savCaseId,
    queryFn: async (): Promise<SAVProviderAssignment[]> => {
      const { data, error } = await supabase
        .from('sav_provider_assignments')
        .select('*')
        .eq('sav_case_id', savCaseId!)
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SAVProviderAssignment[];
    },
  });

  const current = assignments.find((a) => !a.returned_at) || null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sav-provider-assignments', savCaseId] });
    queryClient.invalidateQueries({ queryKey: ['sav-provider-assignments-active'] });
  };

  const assign = async (values: {
    shop_id: string;
    provider_id: string;
    sent_at?: string;
    reason?: string;
    external_ref?: string;
    cost?: number | null;
    notes?: string;
  }) => {
    try {
      if (current) {
        await supabase
          .from('sav_provider_assignments')
          .update({ returned_at: new Date().toISOString() })
          .eq('id', current.id);
      }
      const { error } = await supabase.from('sav_provider_assignments').insert({
        shop_id: values.shop_id,
        sav_case_id: savCaseId!,
        provider_id: values.provider_id,
        sent_at: values.sent_at || new Date().toISOString(),
        reason: values.reason || null,
        external_ref: values.external_ref || null,
        cost: values.cost ?? null,
        notes: values.notes || null,
      });
      if (error) throw error;
      toast({ title: 'Dossier confié au prestataire' });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const markReturned = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('sav_provider_assignments')
        .update({ returned_at: new Date().toISOString() })
        .eq('id', assignmentId);
      if (error) throw error;
      toast({ title: 'Retour du prestataire enregistré' });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase.from('sav_provider_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      toast({ title: 'Attribution supprimée' });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const updateAssignment = async (assignmentId: string, updates: Partial<SAVProviderAssignment>) => {
    try {
      const { error } = await supabase.from('sav_provider_assignments').update(updates).eq('id', assignmentId);
      if (error) throw error;
      invalidate();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  return { assignments, current, isLoading, assign, markReturned, removeAssignment, updateAssignment, refetch };
}

/** Indicateur léger : ce SAV est-il actuellement chez un prestataire ? */
export function useSAVCaseActiveProvider(savCaseId?: string) {
  return useQuery({
    queryKey: ['sav-case-active-provider', savCaseId],
    enabled: !!savCaseId,
    refetchInterval: 30000,
    queryFn: async (): Promise<SAVProviderAssignment | null> => {
      const { data } = await supabase
        .from('sav_provider_assignments')
        .select('*')
        .eq('sav_case_id', savCaseId!)
        .is('returned_at', null)
        .maybeSingle();
      return (data as SAVProviderAssignment) || null;
    },
  });
}
