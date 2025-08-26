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
  invite_code: string;
  logo_url: string;
  max_sav_processing_days_client: number;
  max_sav_processing_days_internal: number;
  website_enabled: boolean;
  website_title: string;
  website_description: string;
  slug: string;
  created_at: string;
  updated_at: string;
  subscription_tier?: string;
  subscription_plan_id?: string;
  sms_credits_allocated?: number;
  sms_credits_used?: number;
  active_sav_count?: number;
  subscription_end?: string;
  sav_warning_enabled?: boolean;
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
      console.log('useShop: Fetching profile for user:', user.id);
      
      // Récupérer d'abord le profil de l'utilisateur pour obtenir son shop_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('useShop: Profile fetch result:', { profile, profileError });

      if (profileError) throw profileError;
      if (!profile?.shop_id) {
        console.log('useShop: No shop_id found in profile');
        setShop(null);
        return;
      }

      console.log('useShop: Fetching shop data for shop_id:', profile.shop_id);

      // Récupérer les données du magasin
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', profile.shop_id)
        .maybeSingle();

      console.log('useShop: Shop fetch result:', { data, error });

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