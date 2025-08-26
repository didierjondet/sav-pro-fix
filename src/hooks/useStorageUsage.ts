import { useState, useEffect } from 'react';
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
  const [storageGB, setStorageGB] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchShopStorage = async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('calculate_shop_storage_usage', {
        p_shop_id: shopId
      });
      
      if (error) {
        console.error('Error fetching shop storage:', error);
        return;
      }

      // Convert bytes to GB
      const gb = data ? Number((data / (1024 * 1024 * 1024)).toFixed(3)) : 0;
      setStorageGB(gb);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopStorage();
  }, [shopId]);

  return {
    storageGB,
    loading,
    refetch: fetchShopStorage
  };
}