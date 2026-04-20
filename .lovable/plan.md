

## Plan : Corriger la persistance du glisser-déposer des statuts SAV

### Diagnostic

Le drag visuel fonctionne (dnd-kit applique correctement les transforms), `handleDragEnd` est appelé, mais la ligne revient à sa position de départ au relâchement. Trois causes combinées expliquent ce comportement :

1. **Pas de mise à jour optimiste** : la liste affichée provient à 100 % du state `statuses` du hook, trié par `display_order`. Au moment du drop, dnd-kit retire son `transform` → la ligne revient visuellement à sa position d'origine. Elle ne bougera que lorsque le state sera mis à jour par le refetch realtime.

2. **Cascade de refetchs realtime** : le `Promise.all` déclenche N `UPDATE` simultanés → N événements `postgres_changes` → N `fetchStatuses()` qui se chevauchent. Pendant cette fenêtre, le state oscille et peut afficher temporairement l'ordre original. Si une seule des N requêtes échoue silencieusement (RLS, erreur réseau), l'ordre final est incohérent.

3. **Erreurs silencieuses de `updateStatusOrder`** : la fonction ne logge pas les erreurs en console et n'affiche pas de toast en cas d'échec partiel — l'utilisateur ne voit aucun feedback.

### Correctif (un seul fichier modifié)

**`src/components/sav/SAVStatusesManager.tsx`** :

1. **State local affiché** : maintenir un state local `localStatuses` synchronisé avec `statuses` via `useEffect`. C'est ce state qui est passé à `SortableContext` et mappé dans le rendu.

2. **Mise à jour optimiste dans `handleDragEnd`** :
   - Calculer `arrayMove(localStatuses, oldIndex, newIndex)`
   - Appliquer immédiatement le nouvel ordre à `localStatuses` (visuellement la ligne reste à sa nouvelle position dès le drop)
   - Lancer ensuite la persistance DB en arrière-plan

3. **Persistance batchée et robuste** :
   - Construire un payload `{ id, display_order: newIndex }[]` pour les rows ayant réellement changé d'ordre
   - Appeler les updates en séquentiel (pas en parallèle) pour éviter la cascade de realtime, OU mieux : utiliser un seul `upsert` avec tous les ids et leurs nouveaux `display_order`
   - En cas d'erreur : log console + toast destructif + rollback du state local vers `statuses`

4. **`useSAVStatuses` (hook)** : améliorer `updateStatusOrder` :
   - Ajouter un `console.log` au début et `console.error` en cas d'erreur (actuellement uniquement toast)
   - Vérifier le `count` retourné par Supabase : si `0 rows updated`, traiter comme une erreur (RLS silencieux)

### Comportement attendu après correctif

- Drop → la ligne reste immédiatement à la nouvelle position (pas de retour visuel)
- DB mise à jour en arrière-plan, realtime confirme
- En cas d'échec (RLS, réseau) → toast d'erreur explicite + retour à la position d'origine
- Aucun flicker, aucune cascade de refetchs

### Ce qui ne change pas

- L'apparence de la liste, les boutons Edit/Delete, les dialogues, les badges
- La structure du composant `SortableStatusRow`
- La table `shop_sav_statuses` et ses politiques RLS
- Les autres composants utilisant `useSAVStatuses` ou `useShopSAVStatuses`

