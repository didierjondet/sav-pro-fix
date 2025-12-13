// Configuration des tailles de widgets pour un système de grille 4 colonnes harmonieux
// Toutes les tailles sont des multiples pour un emboîtement parfait
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetDimensions {
  size: WidgetSize;
  cols: 1 | 2 | 4;
  height: string;
}

export const WIDGET_SIZES: Record<WidgetSize, WidgetDimensions> = {
  // 1 colonne - KPIs simples
  small: {
    size: 'small',
    cols: 1,
    height: 'min-h-[180px]'
  },
  
  // 2 colonnes - Graphiques moyens
  medium: {
    size: 'medium', 
    cols: 2,
    height: 'min-h-[320px]'
  },
  
  // 4 colonnes - Graphiques détaillés
  large: {
    size: 'large',
    cols: 4, 
    height: 'min-h-[450px]'
  },
  
  // 4 colonnes - Dashboards complets
  full: {
    size: 'full',
    cols: 4,
    height: 'min-h-[400px]'
  }
};

// Classes CSS pour chaque taille (responsive)
export const getWidgetGridClasses = (size: WidgetSize): string => {
  const dimensions = WIDGET_SIZES[size];
  
  // Mobile: toujours pleine largeur
  // Tablette (sm): 2 colonnes max
  // Desktop (lg): 4 colonnes
  switch (dimensions.cols) {
    case 1:
      return 'col-span-1 sm:col-span-1 lg:col-span-1';
    case 2:
      return 'col-span-1 sm:col-span-1 lg:col-span-2';
    case 4:
      return 'col-span-1 sm:col-span-2 lg:col-span-4';
    default:
      return 'col-span-1';
  }
};

export const getWidgetHeightClass = (size: WidgetSize): string => {
  return WIDGET_SIZES[size].height;
};

// Configuration des modules avec leurs tailles
export interface ModuleSizeConfig {
  [moduleId: string]: WidgetSize;
}

export const DEFAULT_MODULE_SIZES: ModuleSizeConfig = {
  // KPIs simples - petite taille (1 col)
  'kpi-revenue': 'small',
  'kpi-expenses': 'small', 
  'kpi-profit': 'small',
  'kpi-takeover': 'small',
  'sav-stats': 'small',
  'late-rate': 'small',
  
  // Graphiques moyens (2 cols)
  'top-parts-chart': 'medium',
  'late-rate-chart': 'medium',
  'customer-satisfaction': 'medium',
  'storage-usage': 'medium',
  'quote-rejections': 'medium',
  'top-devices': 'medium',
  
  // Widgets larges (4 cols)
  'revenue-breakdown': 'large',
  'monthly-comparison': 'large',
  'sav-performance': 'large',
  'parts-usage-heatmap': 'large',
  'annual-stats': 'large',
  
  // Widgets full (4 cols)
  'financial-overview': 'full',
  'sav-metrics-combined': 'full',
  'performance-trends': 'full',
  'finance-kpis': 'medium'
};