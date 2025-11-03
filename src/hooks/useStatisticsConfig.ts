import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';

export interface StatisticModule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
  isCustom?: boolean;
  customWidgetId?: string;
  originalPrompt?: string;
  aiInterpretation?: any;
  widget_type?: string; // Garder snake_case pour CustomWidgetRenderer
  chart_type?: string;
  data_source?: string;
  data_config?: any;
  display_config?: any;
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

const STORAGE_KEY = 'statisticsConfig';

export const useStatisticsConfig = () => {
  const [modules, setModules] = useState<StatisticModule[]>([]);
  const [loading, setLoading] = useState(true);
  const { shop } = useShop();

  const loadConfig = async () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let standardModules = saved ? JSON.parse(saved) : DEFAULT_MODULES;

      if (shop?.id) {
        const { data: customWidgets } = await supabase
          .from('custom_widgets')
          .select('*')
          .eq('shop_id', shop.id)
          .order('display_order');

        if (customWidgets) {
          const customModules: StatisticModule[] = customWidgets.map((w, idx) => ({
            id: `custom-${w.id}`,
            name: w.name,
            description: w.description || '',
            enabled: w.enabled,
            order: standardModules.length + idx,
            isCustom: true,
            customWidgetId: w.id,
            originalPrompt: w.original_prompt,
            aiInterpretation: w.ai_interpretation,
            widget_type: w.widget_type, // Garder snake_case pour CustomWidgetRenderer
            chart_type: w.chart_type,
            data_source: w.data_source,
            data_config: w.data_config,
            display_config: w.display_config,
          }));
          console.log('🎨 Custom widgets loaded:', customModules);
          setModules([...standardModules, ...customModules]);
        } else {
          setModules(standardModules);
        }
      } else {
        setModules(standardModules);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setModules(DEFAULT_MODULES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [shop?.id]);

  const saveConfig = async (newModules: StatisticModule[]) => {
    const standard = newModules.filter(m => !m.isCustom);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(standard));
    setModules(newModules);
  };

  const updateModule = async (moduleId: string, updates: Partial<StatisticModule>) => {
    const updated = modules.map(m => m.id === moduleId ? { ...m, ...updates } : m);
    await saveConfig(updated);
  };

  const deleteCustomWidget = async (widgetId: string) => {
    if (!shop?.id) return;
    await supabase.from('custom_widgets').delete().eq('id', widgetId);
    const updated = modules.filter(m => m.customWidgetId !== widgetId);
    setModules(updated);
  };

  const reorderModules = async (newModules: StatisticModule[]) => {
    const reordered = newModules.map((m, i) => ({ ...m, order: i }));
    await saveConfig(reordered);
  };

  const getEnabledModules = () => modules.filter(m => m.enabled).sort((a, b) => a.order - b.order);

  return { modules, loading, updateModule, reorderModules, getEnabledModules, deleteCustomWidget, refetch: loadConfig };
};
