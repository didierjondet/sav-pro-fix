## Problème

Dans l'inventaire en mode simplifié (assisté), cliquer sur **« Enregistrer / suivant »** ou **« Non trouvé »** ne fait pas avancer la progression : le dialogue revient sur le même article et tourne en boucle, rendant la clôture impossible.

## Cause racine

Dans `src/hooks/useInventory.ts`, après chaque mise à jour d'item, on appelle `refreshAll()` qui exécute `queryClient.invalidateQueries(...)`. Or `invalidateQueries` se résout **dès l'invalidation**, pas après le refetch. Conséquence :

1. La ligne est bien marquée `found` / `missing` en base.
2. Mais quand `goToNextPending()` s'exécute juste après dans `InventoryAssistedDialog`, il lit la liste `items` encore obsolète (l'item courant est toujours `pending` côté React) → il retombe sur le même index.
3. En parallèle, le `useEffect([initialIndex, open])` réinitialise `currentIndex` au premier item pending dès que la liste se met enfin à jour, ce qui peut aussi ramener au même article si le rafraîchissement arrive en retard.
4. Si la nouvelle valeur saisie est identique à `expected_quantity`, le statut passe à `found` mais l'UI affiche toujours l'ancien snapshot, donnant l'impression que rien n'a changé.

Le fait que `closeSession` lit aussi `sessionQuery.data` / `itemsQuery.data` obsolètes amplifie le problème : même quand toutes les lignes sont traitées, la clôture peut échouer avec « Toutes les lignes doivent être traitées ».

## Correctif proposé

### 1. `src/hooks/useInventory.ts`
- Remplacer `invalidateQueries` par `refetchQueries` dans `refreshAll()` afin que l'attente couvre réellement le rafraîchissement des données (sessions, items, logs, parts).
- Faire en sorte que `updateItem`, `markItemMissing`, `closeSession` retournent des données fraîches en attendant explicitement les refetch ciblés (au minimum `inventory-items` et `inventory-session`).
- Renvoyer la nouvelle liste d'items depuis `updateItem` pour que les appelants puissent calculer le prochain pending sans dépendre du re-render.

### 2. `src/components/settings/inventory/InventoryAssistedDialog.tsx`
- Supprimer le `useEffect([initialIndex, open])` qui réinitialise `currentIndex` à chaque changement de la liste — il provoque des sauts arrière indésirables. Ne réinitialiser `currentIndex` qu'à l'ouverture du dialogue (`open` passe à `true`) et lors du clic sur « Réviser une ligne ».
- Calculer `goToNextPending` à partir de la **liste fraîche d'items** retournée par `onCount` / `onMissing` plutôt que du snapshot React. Modifier la signature de `onCount` / `onMissing` pour renvoyer la liste mise à jour, ou recalculer depuis le prop après attente d'un microtick.
- Avancer l'index **avant** que la prop `items` ne se mette à jour, en s'appuyant sur l'ID de l'item qu'on vient de traiter (chercher le premier pending dont l'ID ≠ celui qu'on vient de traiter).
- Stabiliser le calcul de `isLastPending` : utiliser la liste fraîche pour déterminer s'il s'agit vraiment de la dernière ligne, sinon on peut tenter de clôturer trop tôt ou trop tard.

### 3. `closeSession` — `src/hooks/useInventory.ts`
- Avant de vérifier `derived.pendingItems.length`, forcer un `refetchQueries({ queryKey: ['inventory-items', sessionId] })` pour garantir des données à jour.
- Idéalement, déplacer cette vérification côté SQL (RPC dédiée) pour éliminer toute course frontend, mais en première intention l'attente du refetch suffit.

## Détails techniques

**Pattern à appliquer pour `refreshAll`** :
```ts
const refreshAll = async () => {
  await Promise.all([
    queryClient.refetchQueries({ queryKey: ['inventory-sessions', shopId] }),
    queryClient.refetchQueries({ queryKey: ['inventory-session', sessionId] }),
    queryClient.refetchQueries({ queryKey: ['inventory-items', sessionId] }),
    queryClient.refetchQueries({ queryKey: ['inventory-logs', sessionId] }),
  ]);
  queryClient.invalidateQueries({ queryKey: ['parts', shopId] }); // non-bloquant
};
```

**Pattern à appliquer dans le dialog** :
```ts
const handleFound = async () => {
  if (!currentItem) return;
  const treatedId = currentItem.id;
  const value = parseQuantity(quantity);
  await onCount(treatedId, value); // attend refetch complet
  // À ce stade, la prop `items` reflète déjà le nouvel état.
  const remaining = orderedItems.filter(i => i.line_status === 'pending' && i.id !== treatedId);
  if (remaining.length === 0) {
    await handleClose();
  } else {
    const nextIdx = orderedItems.findIndex(i => i.id === remaining[0].id);
    setCurrentIndex(nextIdx);
  }
};
```

## Vérification après correctif

1. Lancer un inventaire assisté avec ≥ 3 articles.
2. Pour chaque article cliquer « Enregistrer / suivant » sans modifier la quantité → la progression doit incrémenter et le dialogue doit passer à l'article suivant.
3. Tester « Non trouvé » : même comportement attendu.
4. Sur le dernier article, le bouton doit afficher « Enregistrer et clôturer » et la session doit basculer en `completed` sans erreur.
5. Vérifier qu'aucune erreur « Toutes les lignes doivent être traitées » n'apparaît si toutes les lignes ont bien été comptées.
