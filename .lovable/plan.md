## Problème

Dans la tooltip « SAV en retard », le badge affiche 27 dossiers mais la liste propose « +883 autres » car les deux calculs n'utilisent pas le même filtre :

- **Badge (27)** : utilise `isActiveStatus(savCase.status)` qui exclut dynamiquement tous les statuts marqués comme finaux dans `shop_sav_statuses` (livré, restitué, annulé, prêt, statuts personnalisés du magasin, etc.).
- **Tooltip (891)** : utilise une liste codée en dur `['delivered', 'cancelled', 'ready']` qui rate tous les autres statuts finaux (statuts personnalisés, `is_final_status = true`), et inclut donc des SAV archivés/clos qui ne sont plus « en cours ».

Résultat : la tooltip compte des dossiers déjà terminés comme « en retard ».

## Correction

Dans `src/components/layout/Sidebar.tsx`, aligner `getLateSAVInfo()` sur la logique du badge :

- Remplacer le filtre codé en dur `['delivered', 'cancelled', 'ready'].includes(savCase.status)` par le même appel `isActiveStatus(savCase.status)` que celui utilisé pour `lateSAVCount`.
- Conserver le reste inchangé (pause timer, `calculateSAVDelay`, affichage, bouton « afficher tout »).

Après correction : le badge et la tooltip afficheront le même nombre (27), et le bouton indiquera « +19 autres SAV en retard » (27 − 8) au lieu de +883.

## Périmètre

- Un seul fichier modifié : `src/components/layout/Sidebar.tsx` (fonction `getLateSAVInfo`).
- Aucun changement de logique métier, aucun autre composant touché.