import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface StatisticModule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_MODULES: StatisticModule[] = [
  // Modules du tableau de bord SAV (/dashboard)
  { id: 'sav-types-grid', name: 'Types de SAV', description: 'Répartition et accès rapides', enabled: true, order: 0 },
  { id: 'finance-kpis', name: 'Indicateurs financiers (mois)', description: 'CA, coûts, marge, prises en charge', enabled: true, order: 1 },
  { id: 'storage-usage', name: 'Espace de stockage', description: 'Utilisation du stockage', enabled: true, order: 2 },
  { id: 'sav-type-distribution', name: 'Répartition des SAV', description: 'Par type de service', enabled: true, order: 3 },
  { id: 'monthly-profitability', name: 'Rentabilité mensuelle', description: 'CA vs Coûts vs Marge', enabled: true, order: 4 },
  { id: 'annual-stats', name: 'Statistiques annuelles', description: 'Évolution mensuelle (année)', enabled: true, order: 5 },

  // Widgets avancés combinés - Page Statistiques
  { id: 'financial-overview', name: 'Vue d\'ensemble financière', description: 'Graphique combiné des finances avec KPIs', enabled: true, order: 6 },
  { id: 'performance-trends', name: 'Tendances de performance', description: 'Analyse combinée des performances SAV', enabled: true, order: 7 },
  { id: 'parts-usage-heatmap', name: 'Utilisation des pièces', description: 'Heatmap et analyse d\'usage des pièces', enabled: true, order: 8 },

  // KPIs individuels - Plus petits pour compléter
  { id: 'kpi-revenue', name: 'Chiffre d\'affaires', description: 'Revenus totaux', enabled: true, order: 9 },
  { id: 'kpi-expenses', name: 'Dépenses', description: 'Coût des pièces', enabled: true, order: 10 },
  { id: 'kpi-profit', name: 'Profit', description: 'Bénéfices nets', enabled: true, order: 11 },
  { id: 'kpi-takeover', name: 'Prises en charge', description: 'Montant et nombre', enabled: true, order: 12 },
  { id: 'sav-stats', name: 'SAV & Durée', description: 'Total SAV et temps moyen', enabled: true, order: 13 },
  { id: 'late-rate', name: 'Taux de retard', description: 'SAV en retard', enabled: true, order: 14 },
  
  // Graphiques spécialisés
  { id: 'profitability-chart', name: 'Évolution rentabilité', description: 'Graphique revenus/dépenses/profit', enabled: true, order: 15 },
  { id: 'completed-sav-chart', name: 'SAV terminés', description: 'Évolution des SAV complétés', enabled: true, order: 16 },
  { id: 'top-parts-chart', name: 'Top pièces utilisées', description: 'Classement des pièces', enabled: true, order: 17 },
  { id: 'late-rate-chart', name: 'Évolution retards', description: 'Tendance du taux de retard', enabled: true, order: 18 },
  { id: 'top-devices', name: 'Podium téléphones', description: 'Téléphones les plus réparés', enabled: true, order: 19 },
  
  // Widgets de comparaison
  { id: 'monthly-comparison', name: 'Comparaison mensuelle', description: 'Comparatif mois par mois', enabled: true, order: 20 },
  { id: 'revenue-breakdown', name: 'Répartition du CA', description: 'Analyse détaillée des revenus', enabled: true, order: 21 },
  { id: 'customer-satisfaction', name: 'Satisfaction client', description: 'Indicateurs de satisfaction', enabled: true, order: 22 }
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
      // Utilisation temporaire du localStorage jusqu'à ce que les types Supabase soient mis à jour
      const saved = localStorage.getItem('statisticsConfig');
      if (saved) {
        const savedModules = JSON.parse(saved) as StatisticModule[];
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
      // Utilisation temporaire du localStorage jusqu'à ce que les types Supabase soient mis à jour
      localStorage.setItem('statisticsConfig', JSON.stringify(newModules));
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