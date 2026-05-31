import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { LoanerEquipment } from './useLoanerEquipment';

export interface LoanerLoan {
  id: string;
  shop_id: string;
  equipment_id: string;
  sav_case_id: string | null;
  customer_id: string | null;
  loaned_at: string;
  expected_return_at: string | null;
  returned_at: string | null;
  loan_condition: string | null;
  return_condition: string | null;
  return_photos: string[] | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  equipment?: LoanerEquipment;
}


export interface LoanerLoanInput {
  equipment_id: string;
  sav_case_id?: string | null;
  customer_id?: string | null;
  expected_return_at?: string | null;
  loan_condition?: string | null;
  notes?: string | null;
}

export function useLoanerLoans(savCaseId?: string) {
  const { shop } = useShop();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const shopId = shop?.id;

  const queryKey = ['loaner-loans', shopId, savCaseId];

  const { data: loans = [], isLoading } = useQuery({
    queryKey,
    enabled: !!shopId,
    queryFn: async () => {
      let query = supabase
        .from('loaner_loans' as any)
        .select('*, equipment:loaner_equipment(*)')
        .eq('shop_id', shopId!)
        .order('loaned_at', { ascending: false });
      if (savCaseId) query = query.eq('sav_case_id', savCaseId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as LoanerLoan[];
    },
  });

  const activeLoan = loans.find((l) => !l.returned_at) || null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['loaner-loans', shopId] });
    queryClient.invalidateQueries({ queryKey: ['loaner-equipment', shopId] });
  };

  const createLoan = useMutation({
    mutationFn: async (input: LoanerLoanInput) => {
      if (!shopId) throw new Error('Shop introuvable');
      const { data, error } = await supabase
        .from('loaner_loans' as any)
        .insert([{ ...input, shop_id: shopId, created_by: user?.id || null }])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LoanerLoan;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Matériel prêté' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const returnLoan = useMutation({
    mutationFn: async ({ id, return_condition, notes, return_photos }: { id: string; return_condition?: string | null; notes?: string | null; return_photos?: string[] | null }) => {
      const payload: any = { returned_at: new Date().toISOString(), return_condition, notes };
      if (return_photos !== undefined) payload.return_photos = return_photos ?? [];
      const { error } = await supabase
        .from('loaner_loans' as any)
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Matériel rendu' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });


  const deleteLoan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loaner_loans' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Prêt supprimé' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  return {
    loans,
    activeLoan,
    isLoading,
    createLoan: createLoan.mutateAsync,
    returnLoan: returnLoan.mutateAsync,
    deleteLoan: deleteLoan.mutateAsync,
  };
}

export function useEquipmentLoanHistory(equipmentId: string | null | undefined) {
  const { shop } = useShop();
  const shopId = shop?.id;
  return useQuery({
    queryKey: ['loaner-loans-history', shopId, equipmentId],
    enabled: !!shopId && !!equipmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loaner_loans' as any)
        .select('*, customer:customers(first_name, last_name), sav_case:sav_cases(id, case_number)')
        .eq('shop_id', shopId!)
        .eq('equipment_id', equipmentId!)
        .order('loaned_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

