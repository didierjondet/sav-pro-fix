# Tailles imposées par widget — affichage 100% garanti

## Problème

Le tassage actuel (`col-span` + `row-span` sur une grille `auto-rows-[160px]`) coupe le contenu de certains widgets (KPIs financiers à 4 cartes internes, graphiques, comparatif mensuel). Les tailles sont décidées par catégorie générique (`small`/`medium`/`large`) sans tenir compte du contenu réel.

## Principe

Chaque widget reçoit une **taille intrinsèque imposée et non négociable**, mesurée selon son contenu réel (nombre de KPI internes, hauteur du graphique, légendes, etc.). La grille reste 4 colonnes mais avec des rangées plus petites (`auto-rows-[80px]`) pour permettre des hauteurs fines (multiples de 80px) et caler chaque widget à la bonne hauteur sans rogner.

```text
4 colonnes × rangées 80px, grid-auto-flow: dense
┌──────┬──────┬──────┬──────┐
│ KPI  │ KPI  │ KPI  │ KPI  │  1×2 = 160px
├──────┴──────┴──────┴──────┤
│ finance-kpis (4 cartes)   │  4×3 = 240px
├──────────────┬────────────┤
│ chart medium │ chart med. │  2×4 = 320px
└──────────────┴────────────┘
```

## 1. Catalogue de tailles imposées par widget

Dans `src/components/statistics/StatisticsWidgetSizes.ts`, remplacer le mapping générique par un **catalogue explicite par `widgetId`** :

```ts
// cols (1|2|3|4) × rows (rangées de 80px)
WIDGET_DIMENSIONS: Record<string, { cols, rows }> = {
  // KPIs simples — 1 colonne, hauteur 2 rangées (160px)
  'kpi-revenue':       { cols: 1, rows: 2 },
  'kpi-expenses':      { cols: 1, rows: 2 },
  'kpi-profit':        { cols: 1, rows: 2 },
  'kpi-takeover':      { cols: 1, rows: 2 },
  'sav-stats':         { cols: 1, rows: 2 },
  'late-rate':         { cols: 1, rows: 2 },

  // Bloc 4 KPI financiers — pleine largeur basse
  'finance-kpis':      { cols: 4, rows: 3 },  // 240px

  // Graphiques medium — 2 colonnes, hauteur 4 (320px) pour ne pas couper légendes
  'top-parts-chart':       { cols: 2, rows: 4 },
  'late-rate-chart':       { cols: 2, rows: 4 },
  'customer-satisfaction': { cols: 2, rows: 4 },
  'storage-usage':         { cols: 2, rows: 4 },
  'quote-rejections':      { cols: 2, rows: 4 },
  'top-devices':           { cols: 2, rows: 4 },

  // Widgets larges 4 colonnes
  'revenue-breakdown': { cols: 4, rows: 5 },  // 400px
  'monthly-comparison':{ cols: 4, rows: 5 },
  'sav-performance':   { cols: 4, rows: 5 },
  'annual-stats':      { cols: 4, rows: 5 },

  // Widgets pleins
  'sav-metrics-combined': { cols: 4, rows: 6 },  // 480px
};

// Fallback si widget custom / inconnu
DEFAULT_DIMENSIONS = { cols: 2, rows: 4 };
```

`getWidgetGridClasses(widgetId)` retourne `col-span-1 sm:col-span-{min(cols,2)} lg:col-span-{cols} row-span-{rows}` (mobile : toujours 1 col, hauteur auto).

Suppression de l'enum `WidgetSize` exposée à l'utilisateur (plus de sélecteur small/medium/large/full dans le `WidgetManager` pour les widgets natifs) — la taille est imposée. Pour les widgets custom AI, garder un sélecteur 3 tailles standards (`{cols:2,rows:4}`, `{cols:4,rows:4}`, `{cols:4,rows:6}`).

## 2. Grille dashboard ajustée

Dans `src/components/sav/SAVDashboard.tsx`, remplacer la grille actuelle par :

```tsx
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
auto-rows-[80px] gap-3 [grid-auto-flow:dense]
```

Le wrapper `SortableBlock` reçoit la classe générée par `getWidgetGridClasses(module.id)` (et non plus par `module.size`).

Chaque contenu interne de widget garde `h-full` + `overflow-hidden` sur le `Card`, mais le contenu n'a plus de raison d'être coupé puisque la cellule est dimensionnée pour lui.

## 3. Tassage mobile

En mobile (`grid-cols-1`) : `auto-rows-auto`, chaque widget prend sa hauteur naturelle (les `row-span-*` ne s'appliquent qu'à partir de `sm:`).

## 4. Vérifications visuelles à faire après build

- `finance-kpis` : les 4 cartes internes tiennent sans scroll vertical.
- `monthly-comparison` : graphique + légende + sélecteur année visibles.
- `top-parts-chart` / `late-rate-chart` : axes X et légende non rognés.
- KPI cards (`small`) : titre + valeur + sous-texte sur 160px sans clip.

## Hors-scope

- Pas de modification du `WidgetManager` au-delà du retrait du sélecteur de taille pour les widgets natifs.
- Pas de changement du verrouillage (cadenas) ni du `SortableBlock` au-delà du passage de l'`id` à `getWidgetGridClasses`.
- Pas de changement du contenu des widgets, des hooks de données, ou de la page Statistiques.

## Fichiers touchés

- `src/components/statistics/StatisticsWidgetSizes.ts` — catalogue par `widgetId`, signature `getWidgetGridClasses(id)`.
- `src/components/sav/SAVDashboard.tsx` — grille `auto-rows-[80px]`, classes par id de module.
- `src/components/statistics/WidgetManager.tsx` — retirer le sélecteur de taille pour les widgets natifs (taille imposée).
