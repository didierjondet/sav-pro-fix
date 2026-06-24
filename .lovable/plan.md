Constat : l’écart vient très probablement de deux effets cumulés :

1. Le KPI « Taux de retard » affiche un taux global : `retards / SAV clôturés sur toute la période`.
2. Le graphique « Évolution retards » affiche des taux par bucket/jour/mois. Si on compare visuellement un point, une moyenne de points, ou une valeur arrondie côté graphique, ce n’est pas strictement le même calcul global.
3. Il reste aussi une incohérence de bornes temporelles : dans `useStatistics`, les périodes `30d`, `3m`, `6m`, `1y` démarrent avec `subDays(end, 30)` / `subMonths(end, 3)`, alors que `lateRate.ts` utilise `29 jours`, `2 mois`, etc. Résultat : le KPI peut inclure une journée ou un mois de plus que le graphique.

Plan de correction :

1. Unifier les bornes temporelles
   - Remplacer la logique locale de `getDateRange()` dans `useStatistics.ts` par `getRangeForPeriod()` de `src/lib/lateRate.ts`.
   - Ainsi KPI et graphique auront exactement la même fenêtre temporelle.

2. Unifier le calcul du taux
   - Dans `useStatistics.ts`, remplacer le recalcul manuel `lateCount / totalClosedForRate` par `computeLateRateForPeriod()`.
   - Garder les compteurs affichés sous le KPI, mais issus de la même fonction que le graphique.

3. Corriger le graphique pour éviter une comparaison trompeuse
   - Pour le widget « Évolution retards », calculer aussi un résumé global de la période avec la même fonction.
   - Afficher ce résumé global dans le widget graphique ou son tooltip, pour que la valeur comparable au KPI soit exactement la même.
   - Les points du graphique resteront des valeurs journalières/mensuelles, donc ils peuvent varier, mais le résumé global devra matcher le KPI.

4. Synchroniser les filtres et configurations
   - Vérifier que `late-rate` et `late-rate-chart` utilisent bien les mêmes règles : temporalité, statuts SAV, types SAV, exclusions, statuts finaux, date de clôture.
   - Ne pas toucher à l’UI globale ni aux autres widgets.

5. Vérification attendue
   - Si les deux widgets sont configurés pareil, le taux global affiché dans « Évolution retards » doit être identique au KPI « Taux de retard ».
   - Les points du graphique peuvent rester différents car ce sont des sous-périodes, mais ils ne doivent plus être présentés comme la valeur globale comparable.