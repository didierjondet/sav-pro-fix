// Tailles imposées par widget, adaptatives par breakpoint.
// Grille : auto-rows de 80px à partir de sm. En mobile (<sm), hauteur auto.
// Chaque widget définit son nombre de colonnes en desktop (1|2|4) et
// le nombre de rangées à la fois pour tablette (sm = 2 col max) et desktop (lg).

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetDimensions {
  cols: 1 | 2 | 4;          // colonnes en desktop (lg)
  smRows: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; // hauteur en tablette (2 col max)
  lgRows: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; // hauteur en desktop
}

// Catalogue par widgetId — hauteur tablette plus généreuse car la largeur
// est réduite (max 2 cols) ce qui fait wrapper le contenu interne.
export const WIDGET_DIMENSIONS: Record<string, WidgetDimensions> = {
  // KPIs simples (1 col × 160px) — identiques sur tous écrans
  'kpi-revenue':       { cols: 1, smRows: 2, lgRows: 2 },
  'kpi-expenses':      { cols: 1, smRows: 2, lgRows: 2 },
  'kpi-profit':        { cols: 1, smRows: 2, lgRows: 2 },
  'kpi-takeover':      { cols: 1, smRows: 3, lgRows: 3 },
  'sav-stats':         { cols: 1, smRows: 3, lgRows: 3 },
  'late-rate':         { cols: 1, smRows: 3, lgRows: 3 },

  // Bloc 4 KPI financiers internes — wrap sur 2 cols en tablette
  'finance-kpis':      { cols: 4, smRows: 6, lgRows: 4 },

  // Graphiques medium (2 col)
  'top-parts-chart':       { cols: 2, smRows: 5, lgRows: 4 },
  'late-rate-chart':       { cols: 2, smRows: 5, lgRows: 4 },
  'customer-satisfaction': { cols: 2, smRows: 8, lgRows: 7 },
  'storage-usage':         { cols: 2, smRows: 4, lgRows: 4 },
  'quote-rejections':      { cols: 2, smRows: 5, lgRows: 4 },
  'top-devices':           { cols: 2, smRows: 8, lgRows: 7 },

  // Widgets larges (4 col en desktop, 2 col en tablette)
  'revenue-breakdown':  { cols: 4, smRows: 10, lgRows: 8 },
  'monthly-comparison': { cols: 4, smRows: 8,  lgRows: 6 },
  'sav-performance':    { cols: 4, smRows: 8,  lgRows: 6 },
  'annual-stats':       { cols: 4, smRows: 7,  lgRows: 5 },

  // Widgets pleins
  'sav-metrics-combined': { cols: 4, smRows: 10, lgRows: 7 },
};

const DEFAULT_DIMENSIONS: WidgetDimensions = { cols: 2, smRows: 5, lgRows: 4 };

export const getWidgetDimensions = (widgetId: string): WidgetDimensions => {
  return WIDGET_DIMENSIONS[widgetId] ?? DEFAULT_DIMENSIONS;
};

// Tables de classes littérales (Tailwind purge a besoin de chaînes complètes).
const COL_LG: Record<1 | 2 | 4, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  4: 'lg:col-span-4',
};

const COL_SM: Record<1 | 2 | 4, string> = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
  4: 'sm:col-span-2', // tablette : max 2 colonnes
};

const ROW_SM: Record<number, string> = {
  1: 'sm:row-span-1',  2: 'sm:row-span-2',  3: 'sm:row-span-3',
  4: 'sm:row-span-4',  5: 'sm:row-span-5',  6: 'sm:row-span-6',
  7: 'sm:row-span-7',  8: 'sm:row-span-8',  9: 'sm:row-span-9',
  10: 'sm:row-span-10',
};

const ROW_LG: Record<number, string> = {
  1: 'lg:row-span-1',  2: 'lg:row-span-2',  3: 'lg:row-span-3',
  4: 'lg:row-span-4',  5: 'lg:row-span-5',  6: 'lg:row-span-6',
  7: 'lg:row-span-7',  8: 'lg:row-span-8',  9: 'lg:row-span-9',
  10: 'lg:row-span-10',
};

/**
 * Retourne les classes col-span/row-span adaptatives.
 * Mobile : 1 colonne, hauteur auto (pas de row-span appliqué).
 * Tablette : max 2 colonnes, hauteur smRows × 80px.
 * Desktop : cols natifs, hauteur lgRows × 80px.
 */
export const getWidgetGridClasses = (widgetIdOrSize: string): string => {
  const legacyMap: Record<string, WidgetDimensions> = {
    small:  { cols: 1, smRows: 2, lgRows: 2 },
    medium: { cols: 2, smRows: 5, lgRows: 4 },
    large:  { cols: 4, smRows: 8, lgRows: 6 },
    full:   { cols: 4, smRows: 10, lgRows: 7 },
  };
  const dims = legacyMap[widgetIdOrSize] ?? getWidgetDimensions(widgetIdOrSize);
  return `col-span-1 ${COL_SM[dims.cols]} ${COL_LG[dims.cols]} ${ROW_SM[dims.smRows]} ${ROW_LG[dims.lgRows]}`;
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
