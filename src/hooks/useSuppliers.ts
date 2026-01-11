import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';

export interface SupplierConfig {
  id: string;
  shop_id: string;
  supplier_name: string;
  supplier_url: string;
  username: string | null;
  password_encrypted: string | null;
  price_coefficient: number;
  is_enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierPart {
  name: string;
  reference: string;
  supplier: string;
  purchasePrice: number;
  publicPrice: number;
  availability: string;
  imageUrl?: string;
  url?: string;
}

const DEFAULT_SUPPLIERS = [
  { name: 'mobilax', url: 'https://www.mobilax.fr', label: 'Mobilax' },
  { name: 'utopya', url: 'https://www.utopya.fr', label: 'Utopya' },
];

export function useSuppliers() {
  const { shop } = useShop();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSearching, setIsSearching] = useState(false);

  // Fetch supplier configurations
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', shop?.id],
    queryFn: async () => {
      if (!shop?.id) return [];
      
      const { data, error } = await supabase
        .from('shop_suppliers')
        .select('*')
        .eq('shop_id', shop.id);
      
      if (error) throw error;
      return data as SupplierConfig[];
    },
    enabled: !!shop?.id,
  });

  // Get supplier config with defaults
  const getSupplierConfig = (supplierName: string): SupplierConfig | null => {
    const existing = suppliers.find(s => s.supplier_name === supplierName);
    if (existing) return existing;
    
    // Return default config
    const defaultSupplier = DEFAULT_SUPPLIERS.find(s => s.name === supplierName);
    if (!defaultSupplier) return null;
    
    return {
      id: '',
      shop_id: shop?.id || '',
      supplier_name: defaultSupplier.name,
      supplier_url: defaultSupplier.url,
      username: null,
      password_encrypted: null,
      price_coefficient: 1.5,
      is_enabled: false,
      last_sync_at: null,
      created_at: '',
      updated_at: '',
    };
  };

  // Save supplier configuration
  const saveSupplierMutation = useMutation({
    mutationFn: async (config: Partial<SupplierConfig> & { supplier_name: string }) => {
      if (!shop?.id) throw new Error('No shop ID');
      
      const defaultSupplier = DEFAULT_SUPPLIERS.find(s => s.name === config.supplier_name);
      
      const { data, error } = await supabase
        .from('shop_suppliers')
        .upsert({
          shop_id: shop.id,
          supplier_name: config.supplier_name,
          supplier_url: config.supplier_url || defaultSupplier?.url || '',
          username: config.username,
          password_encrypted: config.password_encrypted,
          price_coefficient: config.price_coefficient ?? 1.5,
          is_enabled: config.is_enabled ?? false,
        }, {
          onConflict: 'shop_id,supplier_name',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', shop?.id] });
      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres du fournisseur ont été mis à jour",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder la configuration",
        variant: "destructive",
      });
    },
  });

  // Search parts from suppliers
  const searchParts = async (
    query: string, 
    selectedSuppliers: string[]
  ): Promise<SupplierPart[]> => {
    if (!shop?.id || !query.trim() || selectedSuppliers.length === 0) {
      return [];
    }

    setIsSearching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-supplier-parts', {
        body: {
          shopId: shop.id,
          suppliers: selectedSuppliers,
          searchQuery: query.trim(),
        },
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erreur lors de la recherche');
      }

      return data.parts || [];
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Erreur de recherche",
        description: error.message || "Impossible de rechercher les pièces",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Test connection to supplier
  const testConnection = async (supplierName: string): Promise<boolean> => {
    if (!shop?.id) return false;
    
    try {
      const { data, error } = await supabase.functions.invoke('search-supplier-parts', {
        body: {
          shopId: shop.id,
          suppliers: [supplierName],
          searchQuery: 'test',
          testConnection: true,
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Connexion réussie",
          description: `Connexion à ${supplierName} établie avec succès`,
        });
        return true;
      } else {
        throw new Error(data?.error || 'Échec de la connexion');
      }
    } catch (error: any) {
      toast({
        title: "Échec de connexion",
        description: error.message || "Impossible de se connecter au fournisseur",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    suppliers,
    isLoading,
    isSearching,
    defaultSuppliers: DEFAULT_SUPPLIERS,
    getSupplierConfig,
    saveSupplier: saveSupplierMutation.mutate,
    isSaving: saveSupplierMutation.isPending,
    searchParts,
    testConnection,
  };
}
