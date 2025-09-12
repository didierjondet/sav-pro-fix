import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StatisticModule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_MODULES: StatisticModule[] = [
  { id: 'kpi-revenue', name: 'Chiffre d\'affaires', description: 'Revenus totaux', enabled: true, order: 0 },
  { id: 'kpi-expenses', name: 'Dépenses', description: 'Coût des pièces', enabled: true, order: 1 },
  { id: 'kpi-profit', name: 'Profit', description: 'Bénéfices nets', enabled: true, order: 2 },
  { id: 'kpi-takeover', name: 'Prises en charge', description: 'Montant et nombre', enabled: true, order: 3 },
  { id: 'sav-stats', name: 'SAV & Durée', description: 'Total SAV et temps moyen', enabled: true, order: 4 },
  { id: 'late-rate', name: 'Taux de retard', description: 'SAV en retard', enabled: true, order: 5 },
  { id: 'profitability-chart', name: 'Graphique Rentabilité', description: 'Évolution revenus/dépenses', enabled: true, order: 6 },
  { id: 'completed-sav-chart', name: 'SAV terminés', description: 'Graphique SAV complétés', enabled: true, order: 7 },
  { id: 'top-parts-chart', name: 'Top pièces', description: 'Pièces les plus utilisées', enabled: true, order: 8 },
  { id: 'late-rate-chart', name: 'Évolution retards', description: 'Évolution du taux de retard', enabled: true, order: 9 },
  { id: 'top-devices', name: 'Podium téléphones', description: 'Téléphones les plus réparés', enabled: true, order: 10 }
];

export const useStatisticsConfig = () => {
  const { toast } = useToast();
  const [modules, setModules] = useState<StatisticModule[]>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        setModules(DEFAULT_MODULES);
        setLoading(false);
        return;
      }

      const { data: config } = await supabase
        .from('shop_statistics_config')
        .select('modules_config')
        .eq('shop_id', profile.shop_id)
        .single();

      if (config?.modules_config) {
        const savedModules = config.modules_config as StatisticModule[];
        // Merger avec les modules par défaut pour ajouter les nouveaux modules
        const mergedModules = DEFAULT_MODULES.map(defaultModule => {
          const savedModule = savedModules.find(sm => sm.id === defaultModule.id);
          return savedModule ? { ...defaultModule, ...savedModule } : defaultModule;
        });
        
        // Ajouter les nouveaux modules qui ne sont pas dans la config sauvée
        savedModules.forEach(savedModule => {
          if (!DEFAULT_MODULES.find(dm => dm.id === savedModule.id)) {
            mergedModules.push(savedModule);
          }
        });

        setModules(mergedModules.sort((a, b) => a.order - b.order));
      } else {
        setModules(DEFAULT_MODULES);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
      setModules(DEFAULT_MODULES);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newModules: StatisticModule[]) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop ID non trouvé');
      }

      const { error } = await supabase
        .from('shop_statistics_config')
        .upsert({
          shop_id: profile.shop_id,
          modules_config: newModules
        });

      if (error) throw error;

      setModules(newModules);
      
      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres des statistiques ont été mis à jour"
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    }
  };

  const updateModule = (moduleId: string, updates: Partial<StatisticModule>) => {
    const newModules = modules.map(module =>
      module.id === moduleId ? { ...module, ...updates } : module
    );
    saveConfig(newModules);
  };

  const reorderModules = (newModules: StatisticModule[]) => {
    const reorderedModules = newModules.map((module, index) => ({
      ...module,
      order: index
    }));
    saveConfig(reorderedModules);
  };

  const getEnabledModules = () => modules.filter(m => m.enabled).sort((a, b) => a.order - b.order);

  return {
    modules,
    loading,
    updateModule,
    reorderModules,
    getEnabledModules,
    refetch: loadConfig
  };
};