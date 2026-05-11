# Correction du widget "Comparaison mensuelle"

## Problème constaté
Sur la page Rapports, le bloc "Récapitulatif des 3 derniers mois" du widget *Comparaison mensuelle* affiche toujours **Octobre, Novembre, Décembre**, alors qu'en mai 2026 on attend **Février, Mars, Avril**.

## Cause
Dans `src/components/statistics/advanced/MonthlyComparisonWidget.tsx`, le récapitulatif utilise :
```ts
data.slice(-3)
```
Or `data` contient systématiquement les 12 mois de l'année (Janvier → Décembre, voir `useMonthlyStatistics`). `slice(-3)` renvoie donc toujours les 3 derniers mois du **calendrier** (Oct/Nov/Déc), pas les 3 derniers mois **réels**.

## Correctif

### 1. `MonthlyComparisonWidget.tsx`
- Calculer dynamiquement les 3 derniers mois pertinents :
  - Si l'année des données = année en cours : prendre les 3 mois qui précèdent le mois courant (mai 2026 → Fév/Mar/Avr).
  - Si année passée : conserver les 3 derniers mois de l'année (Oct/Nov/Déc).
- Pour cela, accepter une prop optionnelle `referenceMonthIndex?: number` (index 0–11) avec fallback sur `new Date().getMonth()` quand l'année correspond à l'année courante. À défaut, garder le comportement actuel.
- Remplacer `data.slice(-3)` par une slice basée sur cet index : `data.slice(Math.max(0, refIndex - 3), refIndex)` (3 mois complets précédant le mois courant).

### 2. `ReportChartsSection.tsx`
- Lors de l'appel du widget, transmettre `referenceMonthIndex` calculé à partir de `dateRange.end` (mois de fin de la période sélectionnée), avec garde si l'année = année courante : `min(end.getMonth(), currentMonth)`.

### 3. `DragDropStatistics.tsx`
- Même chose : passer `referenceMonthIndex = new Date().getMonth()` pour rester cohérent côté tableau de bord.

## Hors périmètre
- Pas de modification du hook `useMonthlyStatistics` (les données restent sur 12 mois).
- Pas de changement du graphe principal (ComposedChart) ni des KPI Croissance / Meilleur mois / Mois difficile.
- Pas de changement de design system / tokens.

## Fichiers modifiés
- `src/components/statistics/advanced/MonthlyComparisonWidget.tsx`
- `src/components/reports/ReportChartsSection.tsx`
- `src/components/statistics/DragDropStatistics.tsx`
