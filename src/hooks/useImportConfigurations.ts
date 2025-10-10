import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import { detectFixwayFormat, FIXWAY_STOCK_HEADERS } from '@/utils/importHelpers';

export interface ColumnMapping {
  field_name: string;
  column_name: string;
  required: boolean;
  type: 'text' | 'number';
  default?: string | number;
}

export interface ImportConfiguration {
  id: string;
  shop_id: string;
  name: string;
  is_default: boolean;
  column_mappings: ColumnMapping[];
  required_columns: string[];
  created_at: string;
  updated_at: string;
}

export function useImportConfigurations() {
  const [configurations, setConfigurations] = useState<ImportConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchConfigurations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('import_configurations')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setConfigurations((data || []).map(config => ({
        ...config,
        column_mappings: config.column_mappings as unknown as ColumnMapping[]
      })));
    } catch (error: any) {
      console.error('Error fetching import configurations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les configurations d'import",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createConfiguration = async (
    name: string,
    columnMappings: ColumnMapping[],
    isDefault: boolean = false
  ): Promise<ImportConfiguration | null> => {
    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop non trouvé pour cet utilisateur');
      }

      // If setting as default, unset other defaults first
      if (isDefault) {
        await supabase
          .from('import_configurations')
          .update({ is_default: false })
          .eq('shop_id', profile.shop_id);
      }

      const { data, error } = await supabase
        .from('import_configurations')
        .insert({
          shop_id: profile.shop_id,
          name,
          column_mappings: columnMappings as unknown as Json,
          is_default: isDefault,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Configuration créée",
        description: `La configuration "${name}" a été créée avec succès`,
      });

      await fetchConfigurations();
      return {
        ...data,
        column_mappings: data.column_mappings as unknown as ColumnMapping[]
      };
    } catch (error: any) {
      console.error('Error creating import configuration:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la configuration",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateConfiguration = async (
    id: string,
    updates: Partial<Pick<ImportConfiguration, 'name' | 'column_mappings' | 'is_default'>>
  ): Promise<boolean> => {
    try {
      // If setting as default, unset other defaults first
      if (updates.is_default) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (profile?.shop_id) {
          await supabase
            .from('import_configurations')
            .update({ is_default: false })
            .eq('shop_id', profile.shop_id);
        }
      }

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.is_default !== undefined) updateData.is_default = updates.is_default;
      if (updates.column_mappings !== undefined) updateData.column_mappings = updates.column_mappings as unknown as Json;

      const { error } = await supabase
        .from('import_configurations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Configuration mise à jour",
        description: "La configuration a été mise à jour avec succès",
      });

      await fetchConfigurations();
      return true;
    } catch (error: any) {
      console.error('Error updating import configuration:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la configuration",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteConfiguration = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('import_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Configuration supprimée",
        description: "La configuration a été supprimée avec succès",
      });

      await fetchConfigurations();
      return true;
    } catch (error: any) {
      console.error('Error deleting import configuration:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la configuration",
        variant: "destructive",
      });
      return false;
    }
  };

  const getDefaultConfiguration = (): ImportConfiguration | null => {
    return configurations.find(config => config.is_default) || configurations[0] || null;
  };

  /**
   * Crée automatiquement une configuration par défaut "Export Fixway" si elle n'existe pas
   */
  const createDefaultFixwayConfig = async (): Promise<ImportConfiguration | null> => {
    try {
      // Vérifier si une config "Export Fixway" existe déjà
      const existingFixwayConfig = configurations.find(
        config => config.name.toLowerCase().includes('fixway')
      );
      
      if (existingFixwayConfig) {
        return existingFixwayConfig;
      }

      // Créer la configuration par défaut
      const defaultMappings: ColumnMapping[] = [
        { field_name: 'name', column_name: 'Nom', required: true, type: 'text' },
        { field_name: 'reference', column_name: 'Référence', required: false, type: 'text' },
        { field_name: 'quantity', column_name: 'Quantité', required: false, type: 'number', default: 0 },
        { field_name: 'min_stock', column_name: 'Stock minimum', required: false, type: 'number', default: 5 },
        { field_name: 'purchase_price', column_name: 'Prix achat (€)', required: false, type: 'number', default: 0 },
        { field_name: 'selling_price', column_name: 'Prix vente (€)', required: false, type: 'number', default: 0 },
        { field_name: 'supplier', column_name: 'Fournisseur', required: false, type: 'text' },
        { field_name: 'notes', column_name: 'Notes', required: false, type: 'text' },
        { field_name: 'time_minutes', column_name: 'Temps (min)', required: false, type: 'number', default: 15 },
      ];

      const config = await createConfiguration('Export Fixway (Stock)', defaultMappings, true);
      return config;
    } catch (error: any) {
      console.error('Error creating default Fixway config:', error);
      return null;
    }
  };

  /**
   * Détecte le format d'un fichier basé sur ses en-têtes
   * @param headers - En-têtes du fichier à analyser
   * @returns 'fixway' si format Fixway détecté, 'custom' sinon
   */
  const detectFormatFromHeaders = (headers: string[]): 'fixway' | 'custom' => {
    const isFixway = detectFixwayFormat(headers, FIXWAY_STOCK_HEADERS, 0.7);
    return isFixway ? 'fixway' : 'custom';
  };

  /**
   * Récupère ou crée la configuration Fixway
   */
  const getOrCreateFixwayConfig = async (): Promise<ImportConfiguration | null> => {
    const existingFixway = configurations.find(
      config => config.name.toLowerCase().includes('fixway')
    );
    
    if (existingFixway) {
      return existingFixway;
    }
    
    return await createDefaultFixwayConfig();
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  return {
    configurations,
    isLoading,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    getDefaultConfiguration,
    createDefaultFixwayConfig,
    detectFormatFromHeaders,
    getOrCreateFixwayConfig,
    refetch: fetchConfigurations,
  };
}