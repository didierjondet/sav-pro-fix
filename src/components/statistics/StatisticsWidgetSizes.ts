// Gabarits modulaires stricts — 4 tailles uniquement.
// Unité de base : 1 col (mobile=1, tablette=max 2, desktop=4) × 120px de hauteur.
// Chaque widget snap sur l'un des 4 gabarits, garantissant un assemblage régulier.

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetDimensions {
  cols: 1 | 2 | 4;
  smRows: number; // hauteur en tablette (2 col max) — généralement plus haute car contenu wrap
  lgRows: number; // hauteur en desktop
}

// 4 gabarits autorisés
const TEMPLATES: Record<WidgetSize, WidgetDimensions> = {
  small:  { cols: 1, smRows: 2, lgRows: 2 }, // 1col × 240px : KPI compact
  medium: { cols: 2, smRows: 4, lgRows: 3 }, // 2col × 360-480px : graphe medium
  large:  { cols: 4, smRows: 5, lgRows: 3 }, // 4col × 360-600px : bandeau large
  full:   { cols: 4, smRows: 7, lgRows: 5 }, // 4col × 600-840px : gros graphique
};

// Mapping widgetId -> gabarit S/M/L/XL (aucune dimension hybride)
const WIDGET_TO_TEMPLATE: Record<string, WidgetSize> = {
  // KPI compacts (S)
  'kpi-revenue':       'small',
  'kpi-expenses':      'small',
  'kpi-profit':        'small',
  'kpi-takeover':      'small',
  'sav-stats':         'small',
  'late-rate':         'small',

  // Graphes / blocs medium (M)
  'top-parts-chart':       'medium',
  'late-rate-chart':       'medium',
  'customer-satisfaction': 'medium',
  'storage-usage':         'medium',
  'quote-rejections':      'medium',
  'top-devices':           'medium',

  // Bandeaux larges (L)
  'finance-kpis':       'large',
  'monthly-comparison': 'large',
  'sav-performance':    'large',
  'annual-stats':       'large',

  // Très grands widgets (XL)
  'revenue-breakdown':     'full',
  'sav-metrics-combined':  'full',
  'financial-overview':    'full',
  'performance-trends':    'full',
  'parts-usage-heatmap':   'full',
};

export const getWidgetDimensions = (widgetId: string): WidgetDimensions => {
  const tpl = WIDGET_TO_TEMPLATE[widgetId] ?? 'medium';
  return TEMPLATES[tpl];
};

// Catalogue exporté (compat).
export const WIDGET_DIMENSIONS: Record<string, WidgetDimensions> = Object.fromEntries(
  Object.entries(WIDGET_TO_TEMPLATE).map(([id, size]) => [id, TEMPLATES[size]])
);

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
 * Retourne les classes col-span/row-span modulaires.
 * Mobile : 1 colonne, hauteur auto.
 * Tablette : max 2 cols, hauteur smRows × 120px.
 * Desktop : cols natifs, hauteur lgRows × 120px.
 */
export const getWidgetGridClasses = (widgetIdOrSize: string): string => {
  const legacyTpl = (TEMPLATES as Record<string, WidgetDimensions>)[widgetIdOrSize];
  const dims = legacyTpl ?? getWidgetDimensions(widgetIdOrSize);
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

export const DEFAULT_MODULE_SIZES: ModuleSizeConfig = Object.fromEntries(
  Object.entries(WIDGET_TO_TEMPLATE)
) as ModuleSizeConfig;
