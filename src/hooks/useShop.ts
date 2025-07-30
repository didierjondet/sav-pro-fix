import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Shop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  sms_credits: number;
  invite_code: string;
  logo_url: string;
  max_sav_processing_days_client: number;
  max_sav_processing_days_internal: number;
  created_at: string;
  updated_at: string;
}

export function useShop() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchShop();
    } else {
      setShop(null);
      setLoading(false);
    }
  }, [user]);

  const fetchShop = async () => {
    if (!user) return;
    
    try {
      // Récupérer d'abord le profil de l'utilisateur pour obtenir son shop_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.shop_id) {
        setShop(null);
        return;
      }

      // Récupérer les données du magasin
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', profile.shop_id)
        .maybeSingle();

      if (error) throw error;
      setShop(data);
    } catch (error: any) {
      console.error('Shop fetch error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du magasin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateShop = async (shopData: Partial<Shop>) => {
    if (!shop) return { data: null, error: new Error("Aucun magasin trouvé") };
    
    try {
      const { data, error } = await supabase
        .from('shops')
        .update(shopData)
        .eq('id', shop.id)
        .select()
        .single();

      if (error) throw error;

      setShop(data);
      toast({
        title: "Succès",
        description: "Informations du magasin mises à jour",
      });

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

  return {
    shop,
    loading,
    updateShop,
    refetch: fetchShop,
  };
}