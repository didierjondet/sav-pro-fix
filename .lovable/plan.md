

## Plan : Stabiliser l'affichage sidebar (types/statuts SAV) + corriger Agenda

### Problème
- `refetchOnMount: 'always'` (App.tsx ligne 64) force un re-fetch à chaque changement de page. Pendant le re-fetch, `loading` repasse à `true` → les types/statuts disparaissent puis réapparaissent.
- Les hooks `useShopSAVTypes` et `useShopSAVStatuses` ont déjà des subscriptions realtime qui invalident le cache quand il y a un changement en base. C'est exactement le comportement souhaité : statique sauf si changement réel.

### Corrections

**Fichier : `src/App.tsx`** (ligne 64)
- Changer `refetchOnMount: 'always'` → `refetchOnMount: true`
- Avec `staleTime: 5min` déjà en place, les données ne seront re-fetchées au mount que si elles sont stale (> 5 min). Les subscriptions realtime continuent de déclencher un refresh immédiat en cas de changement réel (ajout/modif/suppression de type ou statut).

**Fichier : `src/hooks/useShopSAVTypes.ts`**
- Ajouter `placeholderData: (prev) => prev` dans les options `useQuery`. Cela garde les anciennes données affichées pendant un éventuel re-fetch en arrière-plan → zéro flash visuel, même si un re-fetch se produit.

**Fichier : `src/hooks/useShopSAVStatuses.ts`**
- Même chose : ajouter `placeholderData: (prev) => prev` dans `useQuery`.

### Comportement résultat
- **Navigation entre pages** : les types et statuts restent affichés instantanément (données en cache, pas de loading)
- **Ajout/modification/suppression d'un type ou statut** : la subscription realtime (déjà en place dans les deux hooks) invalide le cache → re-fetch automatique → mise à jour visible, mais sans flash car `placeholderData` maintient l'ancien affichage pendant le fetch
- **Nouveau SAV créé** : le compteur par type/statut se met à jour via `useSAVCases` qui a aussi son propre realtime

### Fichiers impactés
- `src/App.tsx` — 1 ligne (refetchOnMount)
- `src/hooks/useShopSAVTypes.ts` — 1 ligne (placeholderData)
- `src/hooks/useShopSAVStatuses.ts` — 1 ligne (placeholderData)

