import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { useToast } from '@/hooks/use-toast';

export type LoanerCategory = 'telephone' | 'ordinateur' | 'tablette' | 'tv' | 'console' | 'autre';
export type LoanerStatus = 'available' | 'loaned' | 'maintenance' | 'retired';

export interface LoanerEquipment {
  id: string;
  shop_id: string;
  name: string;
  category: LoanerCategory;
  brand: string | null;
  model: string | null;
  imei: string | null;
  serial_number: string | null;
  color: string | null;
  notes: string | null;
  photo_url: string | null;
  status: LoanerStatus;
  created_at: string;
  updated_at: string;
}

export type LoanerEquipmentInput = Partial<Omit<LoanerEquipment, 'id' | 'shop_id' | 'created_at' | 'updated_at'>> & {
  name: string;
  category: LoanerCategory;
};

export const LOANER_CATEGORIES: { value: LoanerCategory; label: string }[] = [
  { value: 'telephone', label: 'Téléphone' },
  { value: 'ordinateur', label: 'Ordinateur' },
  { value: 'tablette', label: 'Tablette' },
  { value: 'tv', label: 'TV' },
  { value: 'console', label: 'Console' },
  { value: 'autre', label: 'Autre' },
];

export const LOANER_STATUSES: { value: LoanerStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Disponible', color: 'bg-green-500' },
  { value: 'loaned', label: 'Prêté', color: 'bg-orange-500' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-yellow-500' },
  { value: 'retired', label: 'Retiré', color: 'bg-gray-500' },
];

export function useLoanerEquipment() {
  const { shop } = useShop();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const shopId = shop?.id;

  const queryKey = ['loaner-equipment', shopId];

  const { data: equipment = [], isLoading } = useQuery({
    queryKey,
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loaner_equipment' as any)
        .select('*')
        .eq('shop_id', shopId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LoanerEquipment[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['loaner-loans', shopId] });
  };

  const createEquipment = useMutation({
    mutationFn: async (input: LoanerEquipmentInput) => {
      if (!shopId) throw new Error('Shop introuvable');
      const { data, error } = await supabase
        .from('loaner_equipment' as any)
        .insert([{ ...input, shop_id: shopId }])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LoanerEquipment;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Matériel ajouté' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const updateEquipment = useMutation({
    mutationFn: async ({ id, ...input }: Partial<LoanerEquipmentInput> & { id: string }) => {
      const { error } = await supabase.from('loaner_equipment' as any).update(input).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Matériel mis à jour' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loaner_equipment' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Matériel supprimé' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  return {
    equipment,
    availableEquipment: equipment.filter((e) => e.status === 'available'),
    isLoading,
    createEquipment: createEquipment.mutateAsync,
    updateEquipment: updateEquipment.mutateAsync,
    deleteEquipment: deleteEquipment.mutateAsync,
  };
}
