// Configuration des tailles de widgets pour une présentation harmonieuse
export type WidgetSize = 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'full';

export interface WidgetDimensions {
  size: WidgetSize;
  gridClasses: string;
  aspectRatio?: string;
  minHeight?: string;
}

export const WIDGET_SIZES: Record<WidgetSize, WidgetDimensions> = {
  // 1x1 - Parfait pour les KPIs simples
  small: {
    size: 'small',
    gridClasses: 'col-span-1 row-span-1',
    minHeight: '140px'
  },
  
  // 2x1 - Bon pour les graphiques linéaires simples
  medium: {
    size: 'medium', 
    gridClasses: 'col-span-2 row-span-1',
    minHeight: '140px'
  },
  
  // 2x2 - Parfait pour les graphiques détaillés
  large: {
    size: 'large',
    gridClasses: 'col-span-2 row-span-2', 
    minHeight: '320px'
  },
  
  // 3x1 - Pour les graphiques larges mais pas très hauts
  wide: {
    size: 'wide',
    gridClasses: 'col-span-3 row-span-1',
    minHeight: '160px'
  },
  
  // 1x2 - Pour les listes ou widgets verticaux
  tall: {
    size: 'tall',
    gridClasses: 'col-span-1 row-span-2',
    minHeight: '320px'
  },
  
  // Pleine largeur - Pour les dashboards complexes
  full: {
    size: 'full',
    gridClasses: 'col-span-full row-span-1',
    minHeight: '200px'
  }
};

export const getWidgetClasses = (size: WidgetSize): string => {
  const dimensions = WIDGET_SIZES[size];
  return `${dimensions.gridClasses} ${dimensions.minHeight ? `min-h-[${dimensions.minHeight}]` : ''}`;
};

// Configuration des modules avec leurs tailles
export interface ModuleSizeConfig {
  [moduleId: string]: WidgetSize;
}

export const DEFAULT_MODULE_SIZES: ModuleSizeConfig = {
  // KPIs simples - petite taille
  'kpi-revenue': 'small',
  'kpi-expenses': 'small', 
  'kpi-profit': 'small',
  'kpi-takeover': 'small',
  'sav-stats': 'small',
  'late-rate': 'small',
  
  // Graphiques moyens
  // 'profitability-chart' supprimé
  'top-parts-chart': 'medium',
  'late-rate-chart': 'medium',
  
  // Widgets spéciaux
  'top-devices': 'tall',
  'revenue-breakdown': 'wide',
  'monthly-comparison': 'full',
  'sav-performance': 'large',
  'parts-usage-heatmap': 'wide',
  'customer-satisfaction': 'medium',
  
  // Nouveaux widgets combinés
  'financial-overview': 'full',
  'sav-metrics-combined': 'wide',
  'performance-trends': 'large',
  
  // Nouveaux widgets spécialisés
  'finance-kpis': 'tall',
  'storage-usage': 'medium',
  'annual-stats': 'wide',
  'quote-rejections': 'medium'
};