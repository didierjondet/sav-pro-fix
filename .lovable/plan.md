## Symptôme

À chaque clic sur un lien du menu : page visible un instant → barre de chargement + page blanche → page revient. Ressenti sur toutes les pages.

## Diagnostic

D'après l'analyse du code et des logs console :

1. `App.tsx` impose globalement `refetchOnMount: true` et `refetchOnWindowFocus: true`.
2. La plupart des pages (`SAVList`, `Parts`, `Quotes`, `Customers`, `Orders`, `SAVDetail`…) font `if (loading) return <Loader plein écran />`.
3. `useParts` utilise un `useState(true)` local au lieu de React Query → à chaque remount, `loading` redevient `true` → écran blanc garanti.
4. `useShopSAVTypes` (monté dans la Sidebar, donc présent sur toutes les pages) ouvre un **canal realtime** sur `shop_sav_types` à chaque mount. Combiné aux refetch sur focus/mount, ça multiplie les re-rendus visibles dans les logs (`Polling activé` x3, `Shop data` x3, `Cleanup` répétés).
5. Les modifications récentes (switch « Bon de restitution ») n'ont pas introduit le bug elles-mêmes, mais l'ajout d'une colonne sur `shop_sav_types` et les re-renders sur ce hook l'ont rendu plus visible.

Ce n'est donc pas un seul coupable mais la combinaison `loading plein écran` + `refetchOnMount` agressif + `realtime sur un hook global`.

## Correction proposée (minimale, ciblée)

Aucune modification UI, aucun changement fonctionnel — uniquement la stabilité d'affichage.

### 1. `src/hooks/useShopSAVTypes.ts`
- Supprimer la souscription realtime (`useEffect` lignes 69–92). La table change uniquement depuis Réglages → on garde une invalidation manuelle déjà présente dans `SAVTypesManager` via `refetch()`.
- Conserver `placeholderData: (prev) => prev` déjà en place.

### 2. `src/App.tsx`
- Conserver `refetchOnWindowFocus: true` (utile multi-session).
- Garder `refetchOnMount: true` mais aucun changement nécessaire ici si le point 3 est fait.

### 3. Pages avec `if (loading) return <Loader />`
N'afficher le loader plein écran QUE lors du tout premier chargement (pas de données en cache). Modification ciblée sur les pages réellement concernées par le flash :
- `src/pages/SAVList.tsx` ligne 363
- `src/pages/Parts.tsx` ligne 148
- `src/pages/Quotes.tsx` ligne 684
- `src/pages/Customers.tsx` ligne 170
- `src/pages/Orders.tsx` ligne 184
- `src/pages/SAVDetail.tsx` ligne 251

Pattern :
```text
if (loading && data.length === 0) return <Loader />;
```
(adapté à la donnée principale de chaque page : `cases`, `parts`, `quotes`, `customers`, `orders`, `savCase`)

### 4. `src/hooks/useParts.ts`
Refactor minimal : migrer le `useState(true)` initial vers `useState(false)` quand `shop?.id` est connu et qu'on a déjà des données en mémoire — ou ajouter une garde `if (parts.length === 0 && loading)` côté `Parts.tsx` (option moins invasive, retenue).

## Hors scope

- Aucun changement de comportement métier.
- Aucune modification visuelle des cartes, formulaires, sidebar, header.
- Aucune modification de la fonctionnalité « Bon de restitution » récemment ajoutée.

## Validation

Après application :
- Naviguer entre Dashboard → SAV → Parts → Quotes → Customers : l'ancienne page doit rester visible jusqu'à ce que la nouvelle soit prête, sans flash blanc.
- Vérifier dans les logs que `Polling activé` et `Shop data` ne se répètent plus 3 fois par navigation.
