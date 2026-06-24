## Problème à corriger

Oui, ta remarque est bien prise en compte : le problème prioritaire n’est pas seulement l’écart entre deux widgets, c’est que **changer la temporalité d’un widget, par exemple passer “Taux de retard” de 1 mois calendaire à 3 mois, ne fait pas bouger le résultat comme attendu**.

La correction doit donc garantir que **chaque calcul de widget utilise réellement sa configuration enregistrée** : temporalité, statuts inclus, types SAV inclus.

## Cause probable identifiée dans le code

### 1. Le widget “Taux de retard” lit bien une configuration, mais le recalcul peut rester faux

Dans `DragDropStatistics.tsx`, le widget passe par `StatisticsWidgetContainer`, qui convertit :

```text
monthly            -> 30d
monthly_calendar   -> 1m_calendar
quarterly          -> 3m
yearly             -> 1y
```

Puis il appelle `useStatistics(effectivePeriod, filters)`.

Mais il faut corriger/renforcer `useStatistics`, car le calcul du taux de retard dépend d’une requête séparée `closedSavRaw` et tous les filtres/configurations ne sont pas appliqués de manière suffisamment fiable à cette liste de SAV clôturés. Résultat possible : la valeur peut rester identique malgré un changement 1 mois / 3 mois.

### 2. Le widget “Évolution du retard” ignore totalement sa configuration

Le graphique appelle actuellement `useMonthlyLateRate(year)` via `MonthlyLateRateChart`, donc il calcule toujours par mois de l’année, sans tenir compte de :

- la temporalité du widget ;
- les filtres de statuts ;
- les filtres de types SAV ;
- la même logique de période que le KPI.

Donc même si l’utilisateur change les réglages du widget, ce graphique ne peut pas refléter ces réglages.

## Plan de correction

### 1. Centraliser la logique du taux de retard

Modifier `src/lib/lateRate.ts` pour ajouter une fonction unique de calcul :

```text
computeLateRateForPeriod(cases, options)
```

Elle devra appliquer, dans cet ordre :

1. statut final uniquement ;
2. filtre de statuts du widget si configuré ;
3. filtre de types SAV du widget si configuré ;
4. exclusion des types `exclude_from_stats` ;
5. exclusion des types avec `max_processing_days <= 0` ;
6. attribution par date de clôture réelle via `getClosureDate` ;
7. période exacte demandée : `30d`, `1m_calendar`, `3m`, `1y` ;
8. calcul `lateCount / closedInPeriodCount`.

Cette fonction sera la source unique pour éviter deux logiques concurrentes.

### 2. Corriger `useStatistics` pour que “Taux de retard” bouge réellement

Dans `src/hooks/useStatistics.ts` :

- appliquer les filtres `savStatuses` / `savTypes` aussi sur la liste des SAV clôturés utilisée pour le taux de retard ;
- utiliser la période `effectivePeriod` réellement reçue (`1m_calendar`, `3m`, etc.) ;
- remplacer le bloc de calcul manuel du taux par la fonction centralisée ;
- conserver les valeurs affichées actuellement :
  - `lateRate` ;
  - `lateCount` ;
  - `closedInPeriodCount`.

Objectif : quand tu changes le widget “Taux de retard” de `1 mois calendaire` à `3 mois`, la requête et le calcul changent vraiment, donc la valeur doit pouvoir changer.

### 3. Brancher “Évolution du retard” sur la configuration widget

Modifier `MonthlyLateRateChart.tsx` et son appel dans `DragDropStatistics.tsx` pour que le graphique reçoive son `widgetId` et lise sa configuration.

Le graphique devra utiliser :

- la même temporalité que son widget ;
- les mêmes filtres de statuts ;
- les mêmes filtres de types ;
- la même fonction `computeLateRateForPeriod`.

Ainsi, si le graphique est réglé sur `3 mois`, il affichera une évolution sur 3 mois ; s’il est réglé sur `mois calendaire`, il affichera uniquement la période depuis le 1er du mois.

### 4. Garder l’UI existante

Aucun changement de design prévu :

- pas de changement de carte ;
- pas de changement de couleurs ;
- pas de changement du dialogue de configuration ;
- pas de nouveau bouton ;
- seulement correction de la logique de calcul.

### 5. Vérification attendue après correction

Après implémentation :

1. Régler “Taux de retard” sur `mois calendaire` : la valeur doit correspondre aux SAV clôturés depuis le 1er du mois.
2. Régler “Taux de retard” sur `3 mois` : la valeur doit être recalculée sur les 3 derniers mois et ne pas rester bloquée.
3. Régler “Évolution du retard” sur la même temporalité et les mêmes filtres : le graphique doit utiliser le même périmètre que le KPI.
4. Les compteurs d’audit affichés sous le KPI, `X retards sur Y clôturés`, doivent changer avec la temporalité.

## Fichiers concernés

- `src/lib/lateRate.ts`
- `src/hooks/useStatistics.ts`
- `src/components/statistics/widgets/MonthlyLateRateChart.tsx`
- `src/components/statistics/DragDropStatistics.tsx`
- éventuellement `src/hooks/useMonthlyLateRate.ts` si encore utilisé par ailleurs, mais sans casser les rapports existants.
