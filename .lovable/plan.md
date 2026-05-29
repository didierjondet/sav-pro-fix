## Problème

Depuis la dernière modification de `src/pages/SAVDetail.tsx`, la page « clignote » à chaque mise à jour client : le Sidebar et le Header disparaissent puis réapparaissent.

## Cause

Dans `refreshSavCustomer()`, l'appel à `refetch()` (de `useSAVCases`) relance le chargement global des SAV. Pendant ce refetch, `loading` passe à `true`, ce qui déclenche le loader plein écran de `SAVDetail` et démonte Sidebar + Header. C'est exactement le comportement à éviter (cf. mémoire « Navigation Stability »).

## Correction

Fichier : `src/pages/SAVDetail.tsx`

1. Retirer l'appel `refetch()` à la fin de `refreshSavCustomer`.
2. Retirer `refetch` de la déstructuration de `useSAVCases()` (plus utilisé).
3. Garder le reste intact : la mise à jour locale via `setSavCase({ ...prev, customer_id, customer })` suffit à rafraîchir le bloc « Coordonnées du client » sans recharger la page. La pastille et la liste SAV se mettront à jour via le realtime déjà en place sur `sav_cases`.

## Hors périmètre

- Aucune modification du Sidebar, du Header, du dialog client, du realtime listener, ni du style.
