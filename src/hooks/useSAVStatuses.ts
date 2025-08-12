import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SAVStatus {
  id: string;
  shop_id: string;
  status_key: string;
  status_label: string;
  status_color: string;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSAVStatuses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<SAVStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStatuses();
    }
  }, [user]);

  const fetchStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_sav_statuses')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setStatuses(data || []);
    } catch (error: any) {
      console.error('Error fetching SAV statuses:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les statuts SAV',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createStatus = async (statusData: Omit<SAVStatus, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('shop_sav_statuses')
        .insert([statusData])
        .select()
        .single();

      if (error) throw error;
      
      await fetchStatuses();
      toast({
        title: 'Succès',
        description: 'Statut créé avec succès'
      });
      
      return data;
    } catch (error: any) {
      console.error('Error creating SAV status:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateStatus = async (id: string, updates: Partial<SAVStatus>) => {
    try {
      console.log('🎨 Updating SAV status:', { id, updates });
      
      const { data, error } = await supabase
        .from('shop_sav_statuses')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      
      console.log('✅ Status updated successfully:', data);
      
      await fetchStatuses();
      toast({
        title: 'Succès',
        description: 'Statut mis à jour avec succès'
      });
    } catch (error: any) {
      console.error('❌ Error updating SAV status:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shop_sav_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchStatuses();
      toast({
        title: 'Succès',
        description: 'Statut supprimé avec succès'
      });
    } catch (error: any) {
      console.error('Error deleting SAV status:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateStatusOrder = async (statusId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('shop_sav_statuses')
        .update({ display_order: newOrder })
        .eq('id', statusId);

      if (error) throw error;
      
      await fetchStatuses();
    } catch (error: any) {
      console.error('Error updating status order:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de réorganiser les statuts',
        variant: 'destructive'
      });
    }
  };

  return {
    statuses,
    loading,
    createStatus,
    updateStatus,
    deleteStatus,
    updateStatusOrder,
    refetch: fetchStatuses
  };
}