# Verrouillage de la mise en page + tassage des widgets

## 1. Bouton cadenas à côté de "Gestion widget"

Dans `src/components/sav/SAVDashboard.tsx` (header du tableau de bord, à côté du bouton "Gestion widget") :

- Ajouter un état `isLayoutUnlocked` (par défaut **false** = verrouillé) persisté dans `localStorage` sous `fixway_dashboard_layout_unlocked`.
- Ajouter un `Button variant="outline" size="icon"` affichant :
  - `Lock` (lucide) quand verrouillé (état par défaut)
  - `LockOpen` (lucide) quand déverrouillé, avec un style accent (`text-primary` + anneau) pour bien signaler le mode édition.
- Tooltip : « Verrouiller / Déverrouiller la disposition ».
- Passer `isLayoutUnlocked` en prop à chaque `SortableBlock` et au `DndContext` (sensors désactivés quand verrouillé, soit en ne passant pas les sensors, soit via un `modifiers`/`disabled` côté `useSortable`).

## 2. SortableBlock conditionnel

Dans `src/components/statistics/SortableBlock.tsx` :

- Ajouter une prop `editable?: boolean`.
- Ne rendre la croix `X` (top-left) **que si** `editable && onRemove`.
- Ne rendre le bouton « grip » (6 points, top-right) **que si** `editable`. L'icône `Info` de configuration reste toujours visible.
- Passer `disabled: !editable` à `useSortable({ id, disabled: !editable })` pour neutraliser le drag.
- Quand verrouillé : pas de `cursor-grab`, pas de halo de drag.

## 3. Normalisation des tailles / tassage

Dans `src/components/statistics/StatisticsWidgetSizes.ts` et la grille de `SAVDashboard.tsx` :

- Passer la grille à `grid-cols-4 auto-rows-[160px] gap-3` avec `grid-auto-flow: dense` (classe `[grid-auto-flow:dense]`) pour combler les trous automatiquement.
- Remplacer `min-h-[…]` par des `row-span-N` cohérents :
  - `small` → `col-span-1 row-span-1` (160px)
  - `medium` → `col-span-2 row-span-2` (≈ 328px avec gap)
  - `large` → `col-span-4 row-span-2`
  - `full` → `col-span-4 row-span-3`
- Mobile : `col-span-1` partout, hauteur auto (les `row-span` n'ont d'effet qu'à partir de `sm:`).
- Mettre à jour `getWidgetGridClasses` / `getWidgetHeightClass` pour retourner combinés `col-span-* row-span-*` et plus de `min-h-*` pour éliminer les blancs.
- Vérifier visuellement les widgets `finance-kpis` (medium) et KPIs `small` qui contiennent peu de contenu — ajouter un `h-full` au contenu interne si nécessaire pour qu'ils remplissent leur cellule.

## 4. Hors-scope

- Aucune modification du contenu des widgets, des hooks de données, ou du `WidgetManager`.
- Le bouton « Nouveau SAV » et la logique métier restent inchangés.
- Pas de changement sur la page Statistiques (uniquement le tableau de bord SAV).

## Fichiers touchés

- `src/components/sav/SAVDashboard.tsx` (header + props + état lock)
- `src/components/statistics/SortableBlock.tsx` (prop editable + rendu conditionnel)
- `src/components/statistics/StatisticsWidgetSizes.ts` (row-span / col-span normalisés)
