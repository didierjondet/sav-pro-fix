## Objectif

Stabiliser le widget « Taux de retard » du tableau de bord pour qu'il affiche toujours la valeur correspondant à la temporalité configurée (ex. `monthly_calendar` = mois en cours), sans flash transitoire d'une autre valeur calculée sur 30 j.

## Cause

Dans `src/components/sav/SAVDashboard.tsx`, le composant `DashboardWidgetContainer` :
1. Lit la config widget de façon asynchrone (`useWidgetConfiguration`).
2. Tant que la config n'est pas chargée, `effectivePeriod` retombe sur `'30d'` en dur.
3. `useStatistics` calcule donc d'abord sur 30 j (≈ 96 %), puis recalcule sur « Ce mois » (44,4 %) quand la config arrive.
4. `useStatistics` ne reset pas son `data` lors d'un changement de période → la première valeur (30 j) reste visible jusqu'à la fin du 2ᵉ calcul.

## Modifications

### 1. `src/components/sav/SAVDashboard.tsx` — `DashboardWidgetContainer`
- Récupérer aussi `isLoading` depuis `useWidgetConfiguration(widgetId)`.
- Tant que `isLoading` est vrai **OU** que `stats.loading` est vrai, afficher un placeholder neutre (squelette / `—`) au lieu d'appeler `children(stats, ...)` avec des valeurs potentiellement obsolètes.
- Conserver l'appel `useStatistics` au même endroit dans l'ordre des hooks (pas d'appel conditionnel).

### 2. `src/hooks/useStatistics.ts`
- Au début de `fetchStatistics`, réinitialiser `data` aux valeurs par défaut (mêmes que l'état initial) avant le `setLoading(true)`, pour éviter que l'UI affiche la valeur précédente pendant un changement de période/filtre.

Aucun changement sur la logique de calcul du taux de retard (déjà unifiée via `src/lib/lateRate.ts`).

## Vérification

- Sur `/dashboard` du shop Easy Cash Agde : la valeur du widget « Taux de retard » doit être identique au premier affichage et après navigation aller‑retour.
- Vérifier les autres widgets utilisant `DashboardWidgetContainer` (CA, dépenses, profit, prises en charge, temps moyen, top pièces…) : ils doivent juste afficher un état de chargement court au lieu d'une valeur 30 j transitoire.
