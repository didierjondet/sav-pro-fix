## Problème

Trois sources calculent le taux de retard avec **trois logiques différentes**, d'où les écarts (34,9% / 4,8% / 0%) :

| Fichier | Widget | Logique actuelle |
|---|---|---|
| `src/hooks/useStatistics.ts` | "Taux de retard" (Stats + SAVDashboard) | SAV **actifs** (non clôturés) créés dans la période, dont `created_at + max_processing_days < now` |
| `src/hooks/useCustomWidgetData.ts` | Widget custom `late_rate_percentage` | Idem (SAV actifs vs `now`) |
| `src/hooks/useMonthlyLateRate.ts` | "Évolution du taux de retard" | SAV **clôturés** attribués au **mois de création**, comparant `closure_date` vs `created_at + max_processing_days` |

→ Aucun ne correspond à la nouvelle règle demandée, et le déploiement publié peut afficher 0% si aucun SAV actif n'est en retard à l'instant T.

## Nouvelle règle unique (demandée)

Le **taux de retard d'un mois M** = parmi les SAV **clôturés pendant M** (date de clôture dans M), ceux dont la durée réelle (`closure_date − created_at`) a dépassé le `max_processing_days` configuré pour leur type.

- Attribution = **mois de clôture** (plus mois de création).
- Périmètre = uniquement SAV avec un statut final (`is_final_status`).
- Exclusions : types `exclude_from_stats`, types avec `max_processing_days = 0` (internes), statuts en pause non concernés (puisqu'on regarde la clôture effective).
- Date de clôture = dernier `closure_history[*].closed_at`, fallback `updated_at`.
- Formule : `lateRate = lateClosed / totalClosed * 100`.

## Implémentation

### 1. `src/hooks/useStatistics.ts`
- Ajouter une **seconde requête** sur `sav_cases` filtrée par statut final `is_final_status` (récupérer aussi `shop_sav_statuses.is_final_status`), sur la même fenêtre `[start, end]`, mais en filtrant **côté JS** sur la date de clôture (extraite de `closure_history` ou `updated_at`).
  - Pour éviter de tout télécharger : requête sur `created_at >= start − N jours` où N = max(`max_processing_days`) configuré (ex. 60), puis filtrage JS sur date de clôture ∈ `[start, end]`.
- Calculer `lateCount` / `totalClosed` selon la nouvelle règle.
- Remplacer la valeur `lateRate` exposée dans `savStats.lateRate`.
- Construire `lateRateChart` (par jour/bucket) à partir des SAV clôturés bucketisés par leur date de clôture.

### 2. `src/hooks/useMonthlyLateRate.ts`
- Récupérer SAV via `created_at >= startOfYear − maxProcessingDaysBuffer` pour ne pas manquer les clôtures de janvier issues de SAV ouverts en décembre N-1.
- Bucketiser par **mois de la date de clôture** (au lieu de `created_at`).
- Pour chaque mois, `totalCount` = SAV clôturés ce mois, `lateCount` = ceux dont `(closureDate − createdAt) > max_processing_days`.

### 3. `src/hooks/useCustomWidgetData.ts`
- Remplacer le calcul actuel de `late_rate_percentage` (basé sur SAV actifs) par la même logique : SAV clôturés dans la période / parmi eux ceux qui ont dépassé `max_processing_days`.
- Garder un `activeSavCount` séparé si d'autres métriques l'utilisent (vérification rapide).

### 4. Helper partagé (optionnel mais recommandé)
Extraire dans `src/lib/lateRate.ts` deux helpers :
```ts
getClosureDate(sav): Date            // closure_history[last].closed_at ?? updated_at
isClosedLate(sav, maxDays): boolean  // (closureDate - createdAt) > maxDays
```
Réutilisés par les 3 hooks pour garantir la cohérence.

### 5. Mémoire projet
Mettre à jour `mem://reports/late-rate-calculation-logic` : règle = attribution **mois de clôture** (et plus mois de création).

## Hors scope
- Aucune modification de DB, RLS, edge function ou autres widgets non liés au retard.
- `useSAVDelay.ts` (badge "en retard" sur la liste SAV) reste inchangé : il s'applique aux SAV en cours, pas au taux statistique.
- `check-sav-delays` (notifications temps réel) reste inchangé.

## Vérification post-implémentation
- Mois en cours : la valeur du widget "Taux de retard" doit correspondre à la barre du mois courant dans "Évolution du taux de retard" (au pourcentage près).
- Tester en local + version publiée (mêmes données, même résultat).
