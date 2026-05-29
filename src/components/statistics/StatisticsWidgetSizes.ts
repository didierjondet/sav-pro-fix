// Configuration des tailles de widgets pour un système de grille 4 colonnes harmonieux
// Toutes les tailles sont des multiples pour un emboîtement parfait
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetDimensions {
  size: WidgetSize;
  cols: 1 | 2 | 4;
  height: string;
}

export const WIDGET_SIZES: Record<WidgetSize, WidgetDimensions> = {
  small:  { size: 'small',  cols: 1, height: '' },
  medium: { size: 'medium', cols: 2, height: '' },
  large:  { size: 'large',  cols: 4, height: '' },
  full:   { size: 'full',   cols: 4, height: '' },
};

// Classes CSS (col + row span) pour densifier la grille (auto-rows ~160px)
export const getWidgetGridClasses = (size: WidgetSize): string => {
  switch (size) {
    case 'small':
      return 'col-span-1 sm:col-span-1 lg:col-span-1 sm:row-span-1';
    case 'medium':
      return 'col-span-1 sm:col-span-1 lg:col-span-2 sm:row-span-2';
    case 'large':
      return 'col-span-1 sm:col-span-2 lg:col-span-4 sm:row-span-2';
    case 'full':
      return 'col-span-1 sm:col-span-2 lg:col-span-4 sm:row-span-3';
    default:
      return 'col-span-1';
  }
};

export const getWidgetHeightClass = (_size: WidgetSize): string => '';


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