

## Plan : Activer le glisser-déposer pour réordonner les statuts SAV

### Problème

Dans **Réglages → Statuts SAV**, l'icône de poignée (`GripVertical`) est affichée à gauche de chaque statut, mais elle est purement décorative : aucune logique de glisser-déposer n'est branchée. Le hook `useSAVStatuses` expose pourtant déjà la fonction `updateStatusOrder(statusId, newOrder)` qui met à jour `display_order` en base.

### Solution

Brancher `@dnd-kit/core` + `@dnd-kit/sortable` (déjà utilisés dans le projet pour les widgets statistiques via `SortableBlock.tsx`) sur la liste des statuts.

### Modifications

**Fichier modifié** : `src/components/sav/SAVStatusesManager.tsx`

1. **Imports ajoutés** :
   - `DndContext`, `closestCenter`, `PointerSensor`, `useSensor`, `useSensors` depuis `@dnd-kit/core`
   - `SortableContext`, `verticalListSortingStrategy`, `useSortable`, `arrayMove` depuis `@dnd-kit/sortable`
   - `CSS` depuis `@dnd-kit/utilities`

2. **Extraire la ligne de statut dans un sous-composant `SortableStatusRow`** :
   - Utilise `useSortable({ id: status.id })`
   - Applique `transform` / `transition` sur le `<div>` racine
   - L'icône `GripVertical` reçoit `{...attributes} {...listeners}` + `cursor-grab active:cursor-grabbing`
   - Conserve à l'identique : Badge couleur, libellé, badges (Par défaut, Sidebar, Final, Timer), boutons Edit/Delete

3. **Wrapper la liste dans `<DndContext>` + `<SortableContext>`** :
   - `sensors` configuré avec `PointerSensor` + `activationConstraint: { distance: 5 }` (pour éviter les conflits avec le clic sur le bouton Edit)
   - `onDragEnd` :
     - Calcule la nouvelle position via `arrayMove`
     - Boucle sur les statuts réordonnés et appelle `updateStatusOrder(id, index)` pour chacun (en parallèle via `Promise.all`)
     - Le real-time du hook rafraîchira automatiquement la liste

4. **Aucune modification de la base de données** : la colonne `display_order` et la fonction `updateStatusOrder` existent déjà.

### Comportement attendu

- L'utilisateur clique-maintient sur la poignée `⋮⋮` à gauche d'un statut
- Glisse vers le haut ou le bas
- Au relâchement, `display_order` est mis à jour pour tous les statuts impactés
- La sidebar (qui utilise `useShopSAVStatuses` triés par `display_order`) reflète immédiatement le nouvel ordre via le real-time Supabase

### Ce qui ne change pas

- L'apparence visuelle de la liste reste strictement identique
- Les boutons Edit/Delete et leurs dialogues restent inchangés
- Les statuts par défaut sont également déplaçables (l'ordre n'est pas verrouillé sur ces statuts)

