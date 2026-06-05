## Problème

Le widget "Taux de retard" (43,5 %) et le widget "Évolution des retards" (40,9 % pour juin) utilisent deux logiques différentes :

| Élément | Taux de retard (`useStatistics`) | Évolution des retards (`useMonthlyLateRate`) |
|---|---|---|
| Période | Sélecteur global du dashboard (7j, 30j, 1m calendaire, 3m…) | Toujours mois calendaire (1er → fin du mois) |
| `max_processing_days` par défaut (type non configuré) | 9 j (externe) / 7 j (autres) via `src/lib/lateRate.ts` | 7 j (tous types non "interne") en dur dans le hook |
| Helper utilisé | `getMaxProcessingDays` / `isClosedLate` de `src/lib/lateRate.ts` | Logique recopiée localement |

Résultat : pour le mois en cours, si le sélecteur global n'est pas "Mois calendaire" et/ou s'il existe des SAV externes clôturés entre J+7 et J+9, les deux widgets divergent.

## Correction

1. **`src/hooks/useMonthlyLateRate.ts`** — remplacer la logique locale par les helpers partagés `getMaxProcessingDays`, `getClosureDate`, `isClosedLate` de `src/lib/lateRate.ts`, pour garantir le même seuil de retard partout.
2. **Aligner les exclusions** — utiliser exactement la même liste `excludedFromStatsTypes` (types avec `exclude_from_stats = true`) que `useStatistics`.
3. **Ne rien changer côté période** : "Taux de retard" reste lié au sélecteur global, "Évolution" reste par mois calendaire (c'est leur rôle). Mais préciser dans le tooltip du widget "Taux de retard" la période réellement couverte, pour que l'utilisateur comprenne pourquoi la valeur de juin peut différer du widget mensuel quand le sélecteur n'est pas "Mois en cours".

## Détails techniques

- Fichier modifié : `src/hooks/useMonthlyLateRate.ts`
  - Importer `getMaxProcessingDays`, `getClosureDate`, `isClosedLate` depuis `@/lib/lateRate`.
  - Supprimer la fonction locale `getMaxProcessingDays` (fallback 7) et le calcul manuel de `closureDate` / dépassement de deadline.
- Fichier modifié : `src/components/statistics/DragDropStatistics.tsx` (cas `late-rate`)
  - Ajouter un sous-texte sous le pourcentage indiquant la période exacte utilisée (start → end) pour lever l'ambiguïté avec le widget mensuel.
- Aucun changement DB, aucune migration.

## Vérification

- Sur le dashboard, sélectionner "Mois en cours" (`1m_calendar`) → les deux widgets doivent afficher la **même valeur** pour le mois courant.
- Avec d'autres périodes (30j glissants, etc.), les valeurs peuvent légitimement différer, mais l'écart sera uniquement dû à la fenêtre temporelle, plus jamais au seuil de retard.