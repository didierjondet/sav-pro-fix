## Objectif

Le tableau de bord doit avoir des widgets qui :
- s'emboîtent comme des briques (proportions imposées, pas de tailles "hors gabarit"),
- ne se chevauchent jamais quel que soit l'écran,
- réduisent l'espace blanc entre eux,
- s'agrandissent ou se réduisent dans leur emplacement selon la taille de l'écran, en gardant 100% du contenu visible.

## Pourquoi il y a chevauchement aujourd'hui

Dans `SAVDashboard.tsx`, la grille utilise `sm:auto-rows-[80px]` + `[grid-auto-flow:dense]`. Chaque widget réserve un nombre de rangées fixe (`row-span-N`). Quand le contenu interne d'une carte (titres + KPI + graphique + légende) dépasse `N × 80px`, la carte déborde visuellement sur la rangée du widget voisin → chevauchement.
De plus, `SortableBlock.tsx` a retiré `overflow-hidden`, donc le débordement n'est plus contenu.

## Plan

### 1. Catalogue de tailles "modulaires" imposées
Dans `StatisticsWidgetSizes.ts`, ne garder que 4 gabarits autorisés, tous multiples du même module de base :

```text
S  : 1 col × 2 unités  (KPI compact)
M  : 2 col × 3 unités  (graphe medium)
L  : 4 col × 3 unités  (bandeau)
XL : 4 col × 5 unités  (gros graphique)
```

- Chaque `widgetId` est associé à un gabarit S/M/L/XL — pas de combinaisons hybrides.
- Recalibrer `WIDGET_DIMENSIONS` pour que chaque widget rentre dans le gabarit le plus juste (mesuré sur la carte réelle, pas estimé).
- Sur tablette, les gabarits 4 col passent à 2 col automatiquement avec une hauteur recalculée.

### 2. Grille du dashboard avec rangées plus hautes
Dans `SAVDashboard.tsx` :
- Passer `sm:auto-rows-[80px]` → `sm:auto-rows-[120px]` (unité de base plus grande, donc moins de rangées par widget, et marge interne suffisante).
- Conserver `gap-3` et `grid-auto-flow:dense` pour limiter l'espace blanc.

### 3. Contenir le débordement dans chaque widget
Dans `SortableBlock.tsx`, remettre une contention stricte mais sans couper le contenu utile :
- wrapper : `h-full min-w-0 overflow-hidden`
- enfant interne : `h-full w-full flex flex-col` puis pour le contenu après le header : `flex-1 min-h-0` (les graphes Recharts `ResponsiveContainer` s'adaptent alors à la place disponible au lieu de pousser la carte).

Cela garantit que la carte respecte l'emplacement de la grille (donc pas de chevauchement), et que le contenu se redimensionne dans cet emplacement.

### 4. Adapter les cartes internes pour 100% de contenu visible
Sur les widgets sensibles, s'assurer que la `Card` a `h-full flex flex-col` et que le `CardContent` est `flex-1 min-h-0 overflow-hidden` :
- `FinanceKPIsWidget` (grille interne)
- `MonthlyComparisonWidget`
- `RevenueBreakdownWidget`
- `CustomerSatisfactionWidget`
- `AnnualStatsWidget` ("Statistiques 2026")
- `MonthlyLateRateChart`

Cela ne change pas le contenu, seulement le squelette flex pour que Recharts/legends prennent la place disponible au lieu de déborder.

### 5. Vérification visuelle
- Viewport actuel (~971×696).
- Mobile (~390 largeur).
- Desktop large (~1440).

Vérifier sur chaque viewport :
- aucun widget ne déborde sur son voisin,
- toutes les valeurs/légendes sont visibles,
- l'espace blanc entre widgets est minimal et régulier (gap-3 partout).

### Hors périmètre
- Pas de modification de la logique métier ni des hooks.
- Pas de changement de `WidgetManager` ni de la persistance.
