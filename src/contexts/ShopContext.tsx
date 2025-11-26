import React, { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  ai_market_prices_enabled: boolean | null;
  ai_modules_config: any;
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
  const queryClient = useQueryClient();

  const { data: shop, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['shop', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Récupérer le shop_id depuis le profil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData?.shop_id) {
        console.warn('⚠️ ShopContext: No shop_id found for user');
        return null;
      }

      // Récupérer les données du shop
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', profileData.shop_id)
        .single();

      if (shopError) throw shopError;
      
      console.log('✅ ShopContext: Shop data loaded:', shopData.name);
      return shopData as Shop;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - données du shop changent rarement
    gcTime: 30 * 60 * 1000, // 30 minutes en cache
  });

  const updateShop = async (shopId: string, updates: Partial<Shop>) => {
    try {
      const { error } = await supabase
        .from('shops')
        .update(updates)
        .eq('id', shopId);

      if (error) throw error;

      // Invalider le cache React Query
      queryClient.invalidateQueries({ queryKey: ['shop', user?.id] });

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

  const wrappedRefetch = async () => {
    await refetch();
  };

  return (
    <ShopContext.Provider value={{ 
      shop: shop ?? null, 
      loading, 
      error: error as Error | null, 
      updateShop, 
      refetch: wrappedRefetch
    }}>
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
