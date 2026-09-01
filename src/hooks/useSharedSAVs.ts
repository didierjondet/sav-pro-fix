import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

export interface SharedSAVRow {
  share_id: string;
  sav_case_id: string;
  case_number: string;
  owner_shop_id: string;
  owner_shop_name: string;
  device_brand: string | null;
  device_model: string | null;
  device_color: string | null;
  device_imei: string | null;
  sku: string | null;
  accessories: any;
  problem_description: string | null;
  status: string;
  sent_at: string;
  reason: string | null;
  external_ref: string | null;
  cost: number | null;
  unread_count: number;
}

export interface ShareMessage {
  id: string;
  share_id: string;
  sender_shop_id: string;
  sender_user_id: string | null;
  sender_name: string | null;
  content: string;
  read_at: string | null;
  created_at: string;
}

/** Dossiers confiés à notre magasin par d'autres magasins Fixway. */
export function useSharedSAVs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['shared-savs', user?.id],
    enabled: !!user,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<SharedSAVRow[]> => {
      const { data, error } = await supabase.rpc('get_shared_sav_cases');
      if (error) throw error;
      return (data || []) as SharedSAVRow[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('shared-savs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sav_shares' }, () => {
        queryClient.invalidateQueries({ queryKey: ['shared-savs'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sav_share_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['shared-savs'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useSharedSAVDetail(shareId?: string) {
  return useQuery({
    queryKey: ['shared-sav-detail', shareId],
    enabled: !!shareId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_shared_sav_case', { _share_id: shareId! });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as any) || null;
    },
  });
}

/** Partage actif d'un dossier SAV (côté magasin donneur d'ordre). */
export function useCaseShare(savCaseId?: string) {
  return useQuery({
    queryKey: ['sav-share-for-case', savCaseId],
    enabled: !!savCaseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sav_shares')
        .select('*')
        .eq('sav_case_id', savCaseId!)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || null;
    },
  });
}

/** Fil de discussion inter-magasins. */
export function useShareMessages(shareId?: string) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['share-messages', shareId],
    enabled: !!shareId,
    queryFn: async (): Promise<ShareMessage[]> => {
      const { data, error } = await supabase
        .from('sav_share_messages')
        .select('*')
        .eq('share_id', shareId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ShareMessage[];
    },
  });

  useEffect(() => {
    if (!shareId) return;
    const channel = supabase
      .channel(`share-messages-${shareId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sav_share_messages', filter: `share_id=eq.${shareId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['share-messages', shareId] });
          queryClient.invalidateQueries({ queryKey: ['shared-savs'] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareId, queryClient]);

  const sendMessage = async (content: string) => {
    if (!shareId || !content.trim() || !profile?.shop_id) return;
    const senderName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null;
    const { error } = await supabase.from('sav_share_messages').insert({
      share_id: shareId,
      sender_shop_id: profile.shop_id,
      sender_user_id: profile.user_id ?? null,
      sender_name: senderName,
      content: content.trim(),
    });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      throw error;
    }
    queryClient.invalidateQueries({ queryKey: ['share-messages', shareId] });
  };

  const markRead = async () => {
    if (!shareId || !profile?.shop_id) return;
    await supabase
      .from('sav_share_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('share_id', shareId)
      .is('read_at', null)
      .neq('sender_shop_id', profile.shop_id);
    queryClient.invalidateQueries({ queryKey: ['shared-savs'] });
  };

  return { messages: query.data ?? [], isLoading: query.isLoading, sendMessage, markRead };
}
