import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ShopSettings {
  subscription_menu_visible: boolean;
  sms_credits_allocated: number;
  sms_credits_used: number;
  subscription_tier: string;
}

export function useShopSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchShopSettings();
    } else {
      setSettings(null);
      setLoading(false);
    }
  }, [user]);

  const fetchShopSettings = async () => {
    if (!user) return;
    
    console.log('🔍 Fetching shop settings for user:', user.id);
    
    try {
      // Récupérer l'ID du magasin de l'utilisateur
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();

      console.log('👤 Profile data:', profileData, profileError);

      if (profileError) throw profileError;

      if (profileData?.shop_id) {
        // Récupérer les paramètres du magasin
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('subscription_menu_visible, sms_credits_allocated, sms_credits_used, subscription_tier')
          .eq('id', profileData.shop_id)
          .single();

        console.log('🏪 Shop data:', shopData, shopError);

        if (shopError) throw shopError;

        if (shopData) {
          console.log('✅ Setting shop settings:', shopData);
          setSettings({
            subscription_menu_visible: shopData.subscription_menu_visible ?? true,
            sms_credits_allocated: shopData.sms_credits_allocated || 0,
            sms_credits_used: shopData.sms_credits_used || 0,
            subscription_tier: shopData.subscription_tier || 'free'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching shop settings:', error);
      // Définir des valeurs par défaut en cas d'erreur
      setSettings({
        subscription_menu_visible: true,
        sms_credits_allocated: 0,
        sms_credits_used: 0,
        subscription_tier: 'free'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    refetch: fetchShopSettings,
  };
}