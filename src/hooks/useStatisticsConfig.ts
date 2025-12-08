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
  // Widget monthly-profitability supprimé
  { id: 'annual-stats', name: 'Statistiques annuelles', description: 'Évolution mensuelle (année)', enabled: true, order: 4 },

  // Widgets avancés combinés - Page Statistiques
  { id: 'financial-overview', name: 'Vue d\'ensemble financière', description: 'Graphique combiné des finances avec KPIs', enabled: true, order: 5 },
  { id: 'performance-trends', name: 'Tendances de performance', description: 'Analyse combinée des performances SAV', enabled: true, order: 6 },
  { id: 'parts-usage-heatmap', name: 'Utilisation des pièces', description: 'Heatmap et analyse d\'usage des pièces', enabled: true, order: 7 },

  // KPIs individuels - Plus petits pour compléter
  { id: 'kpi-revenue', name: 'Chiffre d\'affaires', description: 'Revenus totaux', enabled: true, order: 8 },
  { id: 'kpi-expenses', name: 'Dépenses', description: 'Coût des pièces', enabled: true, order: 9 },
  { id: 'kpi-profit', name: 'Profit', description: 'Bénéfices nets', enabled: true, order: 10 },
  { id: 'kpi-takeover', name: 'Prises en charge', description: 'Montant et nombre', enabled: true, order: 11 },
  { id: 'sav-stats', name: 'SAV & Durée', description: 'Total SAV et temps moyen', enabled: true, order: 12 },
  { id: 'late-rate', name: 'Taux de retard', description: 'SAV en retard', enabled: true, order: 13 },
  
  // Graphiques spécialisés
  { id: 'profitability-chart', name: 'Évolution rentabilité', description: 'Graphique revenus/dépenses/profit', enabled: true, order: 14 },
  { id: 'top-parts-chart', name: 'Top pièces utilisées', description: 'Classement des pièces', enabled: true, order: 15 },
  { id: 'late-rate-chart', name: 'Évolution retards', description: 'Tendance du taux de retard', enabled: true, order: 16 },
  { id: 'top-devices', name: 'Podium téléphones', description: 'Téléphones les plus réparés', enabled: true, order: 18 },
  
  // Widgets de comparaison
  { id: 'monthly-comparison', name: 'Comparaison mensuelle', description: 'Comparatif mois par mois', enabled: true, order: 19 },
  { id: 'revenue-breakdown', name: 'Répartition du CA', description: 'Analyse détaillée des revenus', enabled: true, order: 20 },
  { id: 'customer-satisfaction', name: 'Satisfaction client', description: 'Indicateurs de satisfaction', enabled: true, order: 21 }
];

const STORAGE_KEY = 'statisticsConfig';

export const useStatisticsConfig = () => {
  const [modules, setModules] = useState<StatisticModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0); // Compteur pour forcer le rechargement
  const { shop } = useShop();

  const loadConfig = async () => {
    try {
      // 1. TOUJOURS partir de DEFAULT_MODULES complet (23 widgets)
      let mergedModules = [...DEFAULT_MODULES];
      
      // 2. Charger les préférences depuis localStorage (seulement enabled et order)
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const savedPrefs = JSON.parse(saved);
          console.log('📦 Preferences loaded from localStorage:', savedPrefs.length);
          
          // Merger les préférences avec DEFAULT_MODULES
          mergedModules = DEFAULT_MODULES.map(defaultModule => {
            const savedPref = savedPrefs.find((s: StatisticModule) => s.id === defaultModule.id);
            if (savedPref) {
              return {
                ...defaultModule,
                enabled: savedPref.enabled !== undefined ? savedPref.enabled : defaultModule.enabled,
                order: savedPref.order !== undefined ? savedPref.order : defaultModule.order
              };
            }
            return defaultModule;
          });
        } catch (e) {
          console.warn('⚠️ Error parsing localStorage, using defaults:', e);
        }
      }

      // 3. Charger les widgets personnalisés depuis Supabase
      if (shop?.id) {
        const { data: customWidgets, error } = await supabase
          .from('custom_widgets')
          .select('*')
          .eq('shop_id', shop.id)
          .order('display_order');

        if (error) {
          console.error('❌ Error loading custom widgets:', error);
        } else if (customWidgets) {
          const customModules: StatisticModule[] = customWidgets.map((w) => ({
            id: `custom-${w.id}`,
            name: w.name,
            description: w.description || '',
            enabled: w.enabled ?? true,
            order: w.display_order ?? (mergedModules.length + 1),
            isCustom: true,
            customWidgetId: w.id,
            originalPrompt: w.original_prompt,
            aiInterpretation: w.ai_interpretation,
            widget_type: w.widget_type,
            chart_type: w.chart_type,
            data_source: w.data_source,
            data_config: w.data_config,
            display_config: w.display_config,
          }));
          
          console.log('✅ All modules loaded:', {
            standard: mergedModules.length,
            custom: customModules.length,
            total: mergedModules.length + customModules.length
          });
          
          setModules([...mergedModules, ...customModules]);
        } else {
          setModules(mergedModules);
        }
      } else {
        setModules(mergedModules);
      }
    } catch (error) {
      console.error('❌ Critical error loading config:', error);
      setModules(DEFAULT_MODULES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [shop?.id, revision]); // Rechargement automatique quand revision change

  const saveConfig = async (newModules: StatisticModule[]) => {
    const standard = newModules.filter(m => !m.isCustom);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(standard));
    setModules(newModules);
  };

  const updateModule = async (moduleId: string, updates: Partial<StatisticModule>) => {
    const updated = modules.map(m => m.id === moduleId ? { ...m, ...updates } : m);
    
    // Si c'est un widget personnalisé, mettre à jour Supabase
    const module = modules.find(m => m.id === moduleId);
    if (module?.isCustom && module.customWidgetId) {
      const { error } = await supabase
        .from('custom_widgets')
        .update({ 
          enabled: updates.enabled !== undefined ? updates.enabled : module.enabled,
          display_order: updates.order !== undefined ? updates.order : module.order
        })
        .eq('id', module.customWidgetId);
      
      if (error) {
        console.error('Error updating custom widget:', error);
        return;
      }
    }
    
    await saveConfig(updated);
    
    // Forcer le rechargement pour propager les changements immédiatement
    await loadConfig();
  };

  const deleteCustomWidget = async (widgetId: string) => {
    if (!shop?.id) return;
    await supabase.from('custom_widgets').delete().eq('id', widgetId);
    const updated = modules.filter(m => m.customWidgetId !== widgetId);
    setModules(updated);
  };

  const reorderModules = async (newModules: StatisticModule[]) => {
    const reordered = newModules.map((m, i) => ({ ...m, order: i }));
    
    // Mettre à jour l'ordre des widgets personnalisés dans Supabase
    for (const module of reordered.filter(m => m.isCustom)) {
      if (module.customWidgetId) {
        await supabase
          .from('custom_widgets')
          .update({ display_order: module.order })
          .eq('id', module.customWidgetId);
      }
    }
    
    await saveConfig(reordered);
    
    // Forcer le rechargement pour propager les changements immédiatement
    await loadConfig();
  };

  const getEnabledModules = () => modules.filter(m => m.enabled).sort((a, b) => a.order - b.order);

  // Fonction refetch qui force le rechargement via le compteur de révision
  const refetch = async () => {
    await loadConfig();
    setRevision(r => r + 1); // Incrémenter pour forcer le useEffect
  };

  return { modules, loading, updateModule, reorderModules, getEnabledModules, deleteCustomWidget, refetch };
};
