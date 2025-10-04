import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Shop {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  subscription_tier: string;
  subscription_plan_id: string | null;
  subscription_end: string | null;
  subscription_forced: boolean | null;
  active_sav_count: number;
  sms_credits_used: number;
  sms_credits_allocated: number;
  monthly_sav_count: number;
  monthly_sms_used: number;
  purchased_sms_credits: number;
  admin_added_sms_credits: number;
  custom_sav_limit: number | null;
  custom_sms_limit: number | null;
  last_monthly_reset: string | null;
  website_enabled: boolean | null;
  website_title: string | null;
  website_description: string | null;
  slug: string | null;
  invite_code: string | null;
  review_link: string | null;
  auto_review_enabled: boolean;
  custom_review_sms_message: string | null;
  custom_review_chat_message: string | null;
  sav_delay_alerts_enabled: boolean | null;
  sav_warning_enabled: boolean | null;
  menu_dashboard_visible: boolean | null;
  menu_sav_visible: boolean | null;
  menu_customers_visible: boolean | null;
  menu_parts_visible: boolean | null;
  menu_quotes_visible: boolean | null;
  menu_orders_visible: boolean | null;
  menu_chats_visible: boolean | null;
  menu_statistics_visible: boolean | null;
  subscription_menu_visible: boolean;
  sidebar_nav_visible: boolean | null;
  sidebar_sav_types_visible: boolean | null;
  sidebar_sav_statuses_visible: boolean | null;
  sidebar_late_sav_visible: boolean | null;
  forced_features: any;
  created_at: string;
  updated_at: string;
}

interface ShopContextType {
  shop: Shop | null;
  loading: boolean;
  error: Error | null;
  updateShop: (shopId: string, updates: Partial<Shop>) => Promise<void>;
  refetch: () => Promise<void>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);

  const fetchShop = useCallback(async () => {
    if (!user) {
      setShop(null);
      setLoading(false);
      return;
    }

    // Cache valable pendant 5 minutes
    const now = Date.now();
    if (shop && cacheTimestamp && (now - cacheTimestamp) < 5 * 60 * 1000) {
      console.log('🚀 ShopContext: Using cached shop data');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 ShopContext: Fetching shop data for user:', user.id);
      setLoading(true);
      setError(null);
      
      // Récupérer le shop_id depuis le profil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData?.shop_id) {
        console.warn('⚠️ ShopContext: No shop_id found for user');
        setShop(null);
        setLoading(false);
        return;
      }

      // Récupérer les données du shop
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', profileData.shop_id)
        .single();

      if (shopError) throw shopError;
      
      console.log('✅ ShopContext: Shop data loaded:', shopData.name);
      setShop(shopData);
      setCacheTimestamp(Date.now());
    } catch (err: any) {
      console.error('❌ ShopContext: Error fetching shop:', err);
      setError(err);
      setShop(null);
    } finally {
      setLoading(false);
    }
  }, [user, shop, cacheTimestamp]);

  const updateShop = async (shopId: string, updates: Partial<Shop>) => {
    try {
      const { error } = await supabase
        .from('shops')
        .update(updates)
        .eq('id', shopId);

      if (error) throw error;

      // Mettre à jour le cache local
      if (shop && shop.id === shopId) {
        setShop({ ...shop, ...updates });
      }

      toast({
        title: 'Succès',
        description: 'Boutique mise à jour avec succès',
      });
    } catch (error: any) {
      console.error('Error updating shop:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const refetch = async () => {
    setCacheTimestamp(0); // Invalider le cache
    await fetchShop();
  };

  useEffect(() => {
    if (user) {
      fetchShop();
    } else {
      setShop(null);
      setLoading(false);
      setCacheTimestamp(0);
    }
  }, [user?.id]); // Ne dépendre que de l'ID utilisateur

  return (
    <ShopContext.Provider value={{ shop, loading, error, updateShop, refetch }}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
