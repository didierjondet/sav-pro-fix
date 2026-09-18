# Correction urgente : création de SAV bloquée

## Ce qui s'est passé

La modification d'hier (bouton « Archiver » des types de SAV) a changé la façon dont la liste des types est fournie à l'application : elle est désormais recalculée à chaque affichage, même quand rien n'a changé. Plusieurs écrans surveillent cette liste pour se rafraîchir : ils se déclenchent donc en boucle, l'application se fige et la création d'un nouveau SAV ne va plus au bout.

Aucun type de SAV n'a été archivé par erreur (vérifié en base : 0 type archivé sur l'ensemble des magasins), les données sont intactes.

## Correction

- Rendre la liste des types stable : elle n'est recalculée que lorsque les types changent réellement en base.
- Stabiliser de la même façon les fonctions qui donnent le libellé / la couleur d'un type.
- Corriger le rafraîchissement de la liste « Archivés » dans les Réglages pour qu'il ne se relance pas en continu.
- Le comportement visible reste identique : les types archivés disparaissent partout, l'historique garde ses libellés, l'onglet « Archivés » permet de réactiver.

## Détails techniques

- `src/hooks/useShopSAVTypes.ts` : `const types = allTypes.filter(...)` devient un `useMemo` sur `[allTypes]` ; `getTypeInfo`, `getAllTypes`, `getTypeStyle` passent en `useCallback` (dépendances `allTypes` / `types`). Cause de la boucle : `useSAVDelayNotifications.ts:112` et `SAVList.tsx:364` ont `types` en dépendance d'effet/mémo.
- `src/components/sav/SAVTypesManager.tsx` : l'effet ligne 88 utilise `types.length` au lieu de l'objet `types`.
- Aucune migration, aucun autre écran modifié.

## Vérification

Build + ouverture de `/sav/new` et de Réglages → Types de SAV dans le navigateur pour confirmer l'absence de boucle.
