import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StorageUsage {
  shop_id: string;
  shop_name: string;
  storage_bytes: number;
  storage_gb: number;
}

export function useStorageUsage() {
  const [storageUsage, setStorageUsage] = useState<StorageUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStorageUsage = async () => {
    if (!user) return;

    try {
      // Only super admins can fetch all shops storage usage
      const { data, error } = await supabase.rpc('get_all_shops_storage_usage');
      
      if (error) {
        console.error('Error fetching storage usage:', error);
        return;
      }

      setStorageUsage(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email === 'djondet@gmail.com') {
      fetchStorageUsage();
    } else {
      setLoading(false);
    }
  }, [user]);

  const getShopStorageUsage = (shopId: string) => {
    return storageUsage.find(usage => usage.shop_id === shopId);
  };

  return {
    storageUsage,
    loading,
    getShopStorageUsage,
    refetch: fetchStorageUsage
  };
}

export function useShopStorageUsage(shopId?: string) {
  const { data: storageGB = 0, isLoading: loading, refetch } = useQuery({
    queryKey: ['shop-storage', shopId],
    queryFn: async () => {
      if (!shopId) return 0;

      const { data, error } = await supabase.rpc('calculate_shop_storage_usage', {
        p_shop_id: shopId
      });
      
      if (error) throw error;
      
      // Convert bytes to GB
      return data ? Number((data / (1024 * 1024 * 1024)).toFixed(3)) : 0;
    },
    enabled: !!shopId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    storageGB,
    loading,
    refetch,
  };
}