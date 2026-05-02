## Diagnostic

En interrogeant la base, je vois que les mises à jour Supabase **fonctionnent bien** (ex: une ligne en `line_status='found'`, `counted_quantity=0`), mais l'interface ne reflète pas ces changements. La puce reste « À traiter » et le champ « Comptée » reste à `—` parce que la donnée affichée vient de `item.line_status` / `item.counted_quantity` (cache React Query), tandis que seul le **brouillon local** (`draftQuantities`) se met à jour visuellement.

Causes identifiées :

1. **Le cache React Query n'est pas correctement rafraîchi** après l'action. `refreshAll` fait bien un `setQueryData`, mais les composants enfants reçoivent toujours l'ancien tableau `items` parce que la propagation est masquée par les brouillons locaux et le `busyId` qui se réinitialise avant la propagation visuelle.

2. **Confusion « Valider » vs « Ajuster » sur des pièces avec stock théorique = 0.** « Valider » force `counted_quantity = expected_quantity` (donc 0) avec `line_status='found'`. Visuellement c'est trompeur : l'utilisateur croit avoir cliqué sur « Non trouvé ».

3. **« Non trouvé » qui semble inactif** : le draft local passe à `'0'` mais comme la puce ne change pas et que la cellule « Comptée » ne change pas, l'utilisateur en conclut que rien n'a fonctionné. En fait le serveur est à jour mais l'UI ne se rafraîchit pas.

## Plan de correction (UI uniquement, pas de changement DB)

### 1. Forcer le rafraîchissement réel après chaque action

Dans `src/hooks/useInventory.ts` :
- Après `setQueryData` dans `refreshAll`, ajouter `queryClient.invalidateQueries({ queryKey: ['inventory-items', targetSessionId] })` et la même chose pour `inventory-session` afin de garantir le re-render des consommateurs.
- Garder le retour `{ freshSession, freshItems }` pour usage immédiat par les composants (ex. mode assisté).

### 2. Synchroniser le brouillon local avec la donnée fraîche

Dans `src/components/settings/inventory/InventoryManager.tsx` :
- Après chaque action (`handleApplyQuantity`, `handleValidateExpected`, `handleMarkMissing`), nettoyer l'entrée correspondante dans `draftQuantities` et `draftNotes` pour que l'affichage retombe sur la valeur DB fraîche (`item.counted_quantity`).
- Effet visible immédiat : la puce passe à « Trouvé » / « Non trouvé », la cellule « Comptée » affiche la nouvelle valeur, l'écart se met à jour.

### 3. Feedback visuel clair sur la carte (vue standard)

Dans `src/components/settings/inventory/InventoryManualEditor.tsx` :
- Forcer un rafraîchissement de la carte en s'appuyant sur `item.line_status` plutôt que sur le brouillon local pour le champ « Comptée ».
- Afficher la **valeur effective comptée** (DB) à côté du champ d'ajustement quand un brouillon diverge, pour que l'utilisateur voit que l'enregistrement a bien eu lieu.
- Garder le badge dynamique : « À traiter » / « Trouvé » / « Non trouvé » / « Ajusté ».
- Petit toast `Pièce mise à jour` après chaque action pour confirmer immédiatement à l'utilisateur.

### 4. Cas particulier : pièce avec stock théorique = 0

- Si l'utilisateur clique sur « Valider » alors que la quantité attendue est 0, on enregistre bien `found` + `counted_quantity = 0`, mais on affiche un libellé explicite sur le badge : « Trouvé (0) ».
- Comportement « Non trouvé » inchangé : `missing` + `counted_quantity = 0`.

## Fichiers modifiés

- `src/hooks/useInventory.ts` — invalidations + retour `freshItems` plus fiable.
- `src/components/settings/inventory/InventoryManager.tsx` — nettoyage des brouillons après action, toasts.
- `src/components/settings/inventory/InventoryManualEditor.tsx` — affichage piloté par la donnée DB, badge à jour.

## Hors périmètre

- Aucune modification de la base Supabase (les triggers et le schéma sont corrects).
- Aucune modification du mode assisté ni du mode scan.
- Aucune modification du calcul des écarts ou de l'application du stock.