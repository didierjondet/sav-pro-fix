// Tailles imposées par widget pour garantir l'affichage 100% du contenu.
// Grille : 4 colonnes, rangées de 80px (auto-rows-[80px]).
// Chaque widget définit son nombre de colonnes (1|2|4) et de rangées (1..6).

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetDimensions {
  cols: 1 | 2 | 4;
  rows: 1 | 2 | 3 | 4 | 5 | 6;
}

// Catalogue par widgetId — tailles non négociables, calibrées sur le contenu réel.
export const WIDGET_DIMENSIONS: Record<string, WidgetDimensions> = {
  // KPIs simples (1 col × 160px)
  'kpi-revenue':       { cols: 1, rows: 2 },
  'kpi-expenses':      { cols: 1, rows: 2 },
  'kpi-profit':        { cols: 1, rows: 2 },
  'kpi-takeover':      { cols: 1, rows: 2 },
  'sav-stats':         { cols: 1, rows: 2 },
  'late-rate':         { cols: 1, rows: 2 },

  // Bloc 4 KPI financiers internes
  'finance-kpis':      { cols: 4, rows: 3 },

  // Graphiques medium (2 col × 320px)
  'top-parts-chart':       { cols: 2, rows: 4 },
  'late-rate-chart':       { cols: 2, rows: 4 },
  'customer-satisfaction': { cols: 2, rows: 4 },
  'storage-usage':         { cols: 2, rows: 4 },
  'quote-rejections':      { cols: 2, rows: 4 },
  'top-devices':           { cols: 2, rows: 4 },

  // Widgets larges (4 col × 400px)
  'revenue-breakdown':  { cols: 4, rows: 5 },
  'monthly-comparison': { cols: 4, rows: 5 },
  'sav-performance':    { cols: 4, rows: 5 },
  'annual-stats':       { cols: 4, rows: 5 },

  // Widgets pleins (4 col × 480px)
  'sav-metrics-combined': { cols: 4, rows: 6 },
};

const DEFAULT_DIMENSIONS: WidgetDimensions = { cols: 2, rows: 4 };

export const getWidgetDimensions = (widgetId: string): WidgetDimensions => {
  return WIDGET_DIMENSIONS[widgetId] ?? DEFAULT_DIMENSIONS;
};

// Tables de classes littérales (Tailwind a besoin de chaînes complètes pour le purge).
const COL_LG: Record<1 | 2 | 4, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  4: 'lg:col-span-4',
};

const COL_SM: Record<1 | 2 | 4, string> = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
  4: 'sm:col-span-2', // mobile/tablette : max 2 colonnes
};

const ROW_SM: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: 'sm:row-span-1',
  2: 'sm:row-span-2',
  3: 'sm:row-span-3',
  4: 'sm:row-span-4',
  5: 'sm:row-span-5',
  6: 'sm:row-span-6',
};

/**
 * Retourne les classes col-span/row-span pour un widget donné.
 * Accepte soit un widgetId (string), soit une WidgetSize legacy pour rétro-compat.
 */
export const getWidgetGridClasses = (widgetIdOrSize: string): string => {
  // Rétro-compat avec l'ancien type WidgetSize
  const legacyMap: Record<string, WidgetDimensions> = {
    small:  { cols: 1, rows: 2 },
    medium: { cols: 2, rows: 4 },
    large:  { cols: 4, rows: 5 },
    full:   { cols: 4, rows: 6 },
  };
  const dims = legacyMap[widgetIdOrSize] ?? getWidgetDimensions(widgetIdOrSize);
  return `col-span-1 ${COL_SM[dims.cols]} ${COL_LG[dims.cols]} ${ROW_SM[dims.rows]}`;
};

export const getWidgetHeightClass = (_widgetIdOrSize: string): string => '';

// Conservé pour rétro-compat avec WidgetManager / DragDropStatistics.
export const WIDGET_SIZES: Record<WidgetSize, { size: WidgetSize; cols: 1 | 2 | 4; height: string }> = {
  small:  { size: 'small',  cols: 1, height: '' },
  medium: { size: 'medium', cols: 2, height: '' },
  large:  { size: 'large',  cols: 4, height: '' },
  full:   { size: 'full',   cols: 4, height: '' },
};

export interface ModuleSizeConfig {
  [moduleId: string]: WidgetSize;
}

export const DEFAULT_MODULE_SIZES: ModuleSizeConfig = {
  'kpi-revenue': 'small',
  'kpi-expenses': 'small',
  'kpi-profit': 'small',
  'kpi-takeover': 'small',
  'sav-stats': 'small',
  'late-rate': 'small',
  'top-parts-chart': 'medium',
  'late-rate-chart': 'medium',
  'customer-satisfaction': 'medium',
  'storage-usage': 'medium',
  'quote-rejections': 'medium',
  'top-devices': 'medium',
  'revenue-breakdown': 'large',
  'monthly-comparison': 'large',
  'sav-performance': 'large',
  'parts-usage-heatmap': 'large',
  'annual-stats': 'large',
  'financial-overview': 'full',
  'sav-metrics-combined': 'full',
  'performance-trends': 'full',
  'finance-kpis': 'medium',
};
