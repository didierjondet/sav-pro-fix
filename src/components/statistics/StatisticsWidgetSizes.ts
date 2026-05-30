// Gabarits modulaires stricts — 4 tailles uniquement.
// On impose des colonnes fixes + une hauteur MINIMALE (le contenu peut grandir
// pour rester 100% lisible, sans chevaucher les autres widgets).

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetDimensions {
  cols: 1 | 2 | 4;
  /** Hauteur mini en tablette (≤ lg) — en px */
  smMinH: number;
  /** Hauteur mini en desktop (≥ lg) — en px */
  lgMinH: number;
}

// 4 gabarits autorisés
const TEMPLATES: Record<WidgetSize, WidgetDimensions> = {
  small:  { cols: 1, smMinH: 200, lgMinH: 200 },
  medium: { cols: 2, smMinH: 360, lgMinH: 340 },
  large:  { cols: 4, smMinH: 420, lgMinH: 360 },
  full:   { cols: 4, smMinH: 720, lgMinH: 560 },
};

// Mapping widgetId -> gabarit S/M/L/XL
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
  'storage-usage':         'medium',
  'quote-rejections':      'medium',
  'top-devices':           'medium',

  // Bandeaux larges (L)
  'finance-kpis':          'large',
  'sav-performance':       'large',
  'customer-satisfaction': 'large',

  // Très grands widgets (XL)
  'monthly-comparison':    'full',
  'annual-stats':          'full',
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

export const WIDGET_DIMENSIONS: Record<string, WidgetDimensions> = Object.fromEntries(
  Object.entries(WIDGET_TO_TEMPLATE).map(([id, size]) => [id, TEMPLATES[size]])
);

// Classes col-span littérales (Tailwind purge)
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

/**
 * Classes col-span uniquement. La hauteur minimale est appliquée via getWidgetMinHeightStyle.
 * Plus de row-span : on évite ainsi les chevauchements quand le contenu dépasse.
 */
export const getWidgetGridClasses = (widgetIdOrSize: string): string => {
  const legacyTpl = (TEMPLATES as Record<string, WidgetDimensions>)[widgetIdOrSize];
  const dims = legacyTpl ?? getWidgetDimensions(widgetIdOrSize);
  return `col-span-1 ${COL_SM[dims.cols]} ${COL_LG[dims.cols]}`;
};

/** Style inline pour imposer une hauteur minimale responsive via CSS var. */
export const getWidgetMinHeightStyle = (widgetIdOrSize: string): React.CSSProperties => {
  const legacyTpl = (TEMPLATES as Record<string, WidgetDimensions>)[widgetIdOrSize];
  const dims = legacyTpl ?? getWidgetDimensions(widgetIdOrSize);
  return {
    // var consommée par une classe utilitaire (min-h) dans SortableBlock
    ['--w-min-h-sm' as any]: `${dims.smMinH}px`,
    ['--w-min-h-lg' as any]: `${dims.lgMinH}px`,
  };
};

export const getWidgetHeightClass = (_widgetIdOrSize: string): string => '';

// Conservé pour rétro-compat
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
