import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedSMSCredits } from '@/hooks/useUnifiedSMSCredits';

export interface ShopSettings {
  subscription_menu_visible: boolean;
  sms_credits_allocated: number;
  sms_credits_used: number;
  subscription_tier: string;
  sav_warning_enabled: boolean;
  sav_delay_alerts_enabled: boolean;
  sav_client_alert_days: number;
  sav_external_alert_days: number;
  sav_internal_alert_days: number;
}

export function useShopSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { credits: smsCredits } = useUnifiedSMSCredits();

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
          .select('subscription_menu_visible, sms_credits_allocated, sms_credits_used, subscription_tier, sav_warning_enabled, sav_delay_alerts_enabled, sav_client_alert_days, sav_external_alert_days, sav_internal_alert_days')
          .eq('id', profileData.shop_id)
          .single();

        console.log('🏪 Shop data:', shopData, shopError);

        if (shopError) throw shopError;

        if (shopData) {
          console.log('✅ Setting shop settings:', shopData);
          setSettings({
            subscription_menu_visible: shopData.subscription_menu_visible ?? true,
            sms_credits_allocated: smsCredits?.total_available || shopData.sms_credits_allocated || 0,
            sms_credits_used: smsCredits?.total_available - smsCredits?.total_remaining || shopData.sms_credits_used || 0,
            subscription_tier: shopData.subscription_tier || 'free',
            sav_warning_enabled: shopData.sav_warning_enabled ?? true,
            sav_delay_alerts_enabled: shopData.sav_delay_alerts_enabled ?? false,
            sav_client_alert_days: shopData.sav_client_alert_days || 2,
            sav_external_alert_days: shopData.sav_external_alert_days || 2,
            sav_internal_alert_days: shopData.sav_internal_alert_days || 2
          });
        }
      }
    } catch (error) {
      console.error('Error fetching shop settings:', error);
      // Définir des valeurs par défaut en cas d'erreur
      setSettings({
        subscription_menu_visible: true,
        sms_credits_allocated: smsCredits?.total_available || 0,
        sms_credits_used: smsCredits?.total_available - smsCredits?.total_remaining || 0,
        subscription_tier: 'free',
        sav_warning_enabled: true,
        sav_delay_alerts_enabled: false,
        sav_client_alert_days: 2,
        sav_external_alert_days: 2,
        sav_internal_alert_days: 2
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