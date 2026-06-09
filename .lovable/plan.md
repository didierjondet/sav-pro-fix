## Diagnostic

Le sous-agent a confirmé le bug. Le stock affiché dans les SAV et devis **ne se rafraîchit pas** après une réception de commande (ou tout autre changement de stock) car :

1. Aucun abonnement realtime Supabase sur la table `parts`.
2. `useParts` et les composants `SAVPartsRequirements`/`SAVPartsEditor` utilisent du `useState` local — pas de react-query, donc pas d'invalidation possible depuis l'extérieur.
3. `useOrders.receiveOrderItem()` met bien à jour `parts.quantity` en DB mais n'avertit que ses propres états internes (`refreshAllData` reste local au hook). Le callback `onPartsUpdated` passé à `SAVPartsRequirements` est un `() => {}` no-op.
4. **Incohérence supplémentaire** : `SAVPartsRequirements` affiche `parts.quantity` brut (sans soustraire `reserved_quantity`), alors que `SAVPartsEditor` calcule correctement `quantity - reserved_quantity`. Les deux vues du même SAV affichent donc des stocks différents.

---

## Plan de correction

Objectif : tout changement de `parts` (réception commande, ajustement, vente, conversion devis→SAV…) est répercuté **en direct** partout (cards SAV, dialog editor, picker devis), avec une formule d'available stock cohérente.

### 1. Ajouter un canal realtime central sur la table `parts`

Fichier : `src/hooks/useParts.ts`
- Dans le `useEffect` existant lié à `shop?.id`, ajouter un `supabase.channel('parts-changes')` qui écoute `postgres_changes` (`*`, schema `public`, table `parts`, filtre `shop_id=eq.{shop.id}`) et appelle `fetchParts()` à chaque event.
- Cleanup `removeChannel` au démontage.

Effet : la liste interne de `useParts` (utilisée par `QuoteForm`, `Parts`, etc.) reste toujours synchro avec la DB sans dépendre du composant qui modifie le stock.

### 2. Émettre un événement global de mise à jour stock

Pour les composants qui n'utilisent pas `useParts` (les `SAVPartsRequirements`/`SAVPartsEditor` interrogent `sav_parts` joint à `parts`), on s'appuie sur le même channel realtime mais côté composant.

Fichier : `src/components/sav/SAVPartsRequirements.tsx`
- Ajouter un `useEffect` qui souscrit à `postgres_changes` sur `parts` (filtre `shop_id`) et sur `sav_parts` (filtre `sav_case_id`), et rappelle `fetchPartsRequirements()`.
- Cleanup à la fin.

Fichier : `src/components/sav/SAVPartsEditor.tsx`
- Idem : ajouter un abonnement realtime `parts` (filtre `shop_id`) qui rappelle `fetchSAVParts()` quand le dialog est ouvert.

### 3. Aligner la formule d'available stock dans `SAVPartsRequirements`

Fichier : `src/components/sav/SAVPartsRequirements.tsx`
- Étendre le `select` pour inclure `reserved_quantity`.
- Calculer `available_stock = Math.max(0, (parts.quantity || 0) - (parts.reserved_quantity || 0))` (même formule que `SAVPartsEditor`).
- `needs_ordering` recalculé avec cette même formule.

### 4. Invalidation explicite après `receiveOrderItem`

Fichier : `src/hooks/useOrders.ts`
- Après le succès de `receiveOrderItem` (et `restockPart`, `cancelOrderItem` pour cohérence), injecter `queryClient.invalidateQueries({ queryKey: ['quotes'] })` et dispatcher un `window.dispatchEvent(new CustomEvent('parts-stock-updated'))` (filet de sécurité si realtime indisponible).
- Les composants ci-dessus écouteront aussi cet événement (`window.addEventListener('parts-stock-updated', refetch)`).

### 5. Rien d'autre n'est touché

- Pas de modif UI/visuelle.
- Pas de migration DB (realtime sur `parts` est déjà activé côté Supabase pour les tables `public`; vérifier via `supabase--read_query` sur `pg_publication_tables` si besoin, sinon ajouter une migration `ALTER PUBLICATION supabase_realtime ADD TABLE public.parts`).

### Vérification post-implémentation

- Recevoir une commande depuis l'écran Commandes : l'onglet SAV ouvert doit voir le badge stock passer de 0 → reçu sans recharger.
- Ouvrir QuoteForm, rechercher la pièce : le compteur Stock se met à jour en live.
- Comparer `SAVPartsRequirements` vs `SAVPartsEditor` : même valeur d'available stock.
