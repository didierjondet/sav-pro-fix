## Objectif

Donner aux cartes de pièces une dominante de couleur selon leur statut, et avertir l'utilisateur avant d'écraser une ligne déjà traitée.

## 1. Dominante visuelle par statut

Dans `src/components/settings/inventory/InventoryManualEditor.tsx`, appliquer une teinte de fond et de bordure sur le conteneur de chaque carte selon `item.line_status` :

| Statut | Dominante |
|---|---|
| `pending` (À traiter) | Neutre actuel (`bg-card`) |
| `found` (Traité) | Vert : `bg-success/10 border-success/40` |
| `adjusted` (Ajusté) | Jaune : `bg-warning/15 border-warning/50` |
| `missing` (Non trouvé) | Rouge : `bg-destructive/10 border-destructive/40` |
| `applied` | Vert atténué (`bg-success/5 border-success/30`) |
| `skipped` | Gris (`bg-muted/50 border-dashed`) |

La dominante se recalcule automatiquement à chaque changement de `line_status` (déjà réactif via React Query + optimistic update). Aucune action supplémentaire requise.

Le badge de statut existant garde sa variante actuelle pour rester lisible par-dessus la dominante.

### Détail technique

```tsx
const STATUS_DOMINANCE: Record<InventoryLineStatus, string> = {
  pending: "bg-card border-border",
  found: "bg-success/10 border-success/40",
  adjusted: "bg-warning/15 border-warning/50",
  missing: "bg-destructive/10 border-destructive/40",
  applied: "bg-success/5 border-success/30",
  skipped: "bg-muted/50 border-dashed",
};

<div className={cn(
  "flex flex-col gap-3 rounded-lg border p-3 shadow-sm sm:p-4 transition-colors",
  STATUS_DOMINANCE[item.line_status]
)}>
```

Les tokens `success`, `warning`, `destructive` existent déjà dans `index.css` / `tailwind.config.ts` — pas de couleur en dur.

## 2. Avertissement avant modification d'une ligne déjà traitée

Quand l'utilisateur clique sur **Valider**, **Non trouvé** ou **Ajuster** sur une carte dont `line_status !== 'pending'`, afficher d'abord un `AlertDialog` (shadcn) :

> « Cette pièce a déjà été traitée (statut actuel : Traité / Ajusté / Non trouvé, quantité comptée : X). En continuant, l'ancienne saisie sera écrasée. Confirmer la modification ? »

Boutons : **Annuler** / **Écraser la saisie**.

- L'avertissement s'affiche pour les 3 boutons d'action (found / missing / adjust).
- Si l'utilisateur confirme, l'action s'exécute normalement (RPC `set_inventory_item_count` existant).
- Si la ligne est `pending`, aucun dialog → comportement actuel inchangé.
- L'utilisateur peut toujours éditer librement les champs Quantité / Note (pas de blocage), seul l'enregistrement via les 3 boutons déclenche l'avertissement.

### Détail technique

- Réutiliser `AlertDialog` de `@/components/ui/alert-dialog` (déjà présent dans le projet).
- Stocker dans un state local `pendingAction: { item, action: 'found'|'missing'|'adjust' } | null`.
- Les handlers `handleFound`, `handleMissing`, `handleAdjust` deviennent :
  ```ts
  const handleFound = (item) => {
    if (item.line_status !== 'pending') {
      setPendingAction({ item, action: 'found' });
      return;
    }
    runFound(item);
  };
  ```
- À la confirmation du dialog, appeler la fonction `runXxx` correspondante.

## Hors scope

- Pas de changement de la logique serveur, des hooks `useInventory`, ni des RPC.
- Pas de migration DB.
- Aucun impact sur l'application finale du stock (`apply_inventory_session`).
