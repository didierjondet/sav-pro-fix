## Améliorations de la page Inventaire (session déjà clôturée / ouverte dans un onglet)

### 1. Inverser et renommer les blocs 1 et 2

Fichier : `src/components/settings/inventory/InventorySessionTab.tsx`

- Échanger l'ordre d'affichage : le bloc « Rapprochement » passe en premier (numéro 1), le bloc « Comptage » passe en second (numéro 2).
- Renommer les titres :
  - Ancien Bloc 2 (Rapprochement) → **« 1 — Analyse & rapprochement »**
  - Ancien Bloc 1 (Comptage) → **« 2 — Comptage / saisie terrain »**

### 2. Minimiser la zone « Comptage / saisie terrain » quand l'inventaire est clos

Quand `session.status` ∈ `completed | applied | cancelled` (i.e. `!canEditSession`) :
- Replier le bloc Comptage dans un `<Collapsible>` (fermé par défaut), avec un en-tête compact « Voir la saisie terrain (lecture seule) ».
- À l'intérieur, réduire la hauteur du `ScrollArea` de `InventoryManualEditor` (passer de `h-[60vh] min-h-[420px]` à `h-[280px]`) lorsqu'utilisé dans ce contexte → ajouter une prop `compact?: boolean` à `InventoryManualEditor`.
- Masquer la barre d'actions (boutons Valider/Non trouvé/Ajuster) puisque non éditable — déjà géré, mais on retire aussi la zone Quantité/Note inutile en lecture seule, on garde uniquement l'en-tête + grille Théorique/Comptée/Écart.

### 3. Bug onglet « Manquants » : valeurs à 0

Fichier : `src/hooks/inventory/derived.ts`

Cause : la règle actuelle classe en `missingItems` toute ligne non-pending dont `counted_quantity === 0`, **y compris les pièces dont la quantité théorique était déjà 0** (donc aucun écart, rien à montrer). Résultat : des cards « fantômes » avec Théorique=0, Comptée=0, Écart=0.

Correctif :
```ts
const missingItems = items.filter(
  (item) =>
    item.line_status !== 'pending' &&
    (item.line_status === 'missing' || item.is_missing ||
     ((item.counted_quantity ?? 0) === 0 && item.expected_quantity > 0)),
);
```

### 4. Ajouter la valeur d'achat totale par pièce sur les cards

Fichier : `src/components/settings/inventory/InventoryManualEditor.tsx`

Sur chaque card item, sous la grille Théorique/Comptée/Écart, ajouter une petite ligne récap :

```
Achat unitaire : {currency(item.unit_cost)} · Total théorique : {currency(item.unit_cost * item.expected_quantity)} · Total compté : {currency(item.unit_cost * (item.counted_quantity ?? 0))}
```

Importer le helper `currency` depuis `InventorySessionTab.tsx` (l'extraire dans `src/lib/utils.ts` ou dupliquer localement — plus simple : helper local dans le fichier).

### Récap des fichiers modifiés

- `src/components/settings/inventory/InventorySessionTab.tsx` — réorganisation des blocs, renommage, collapsible quand clos
- `src/components/settings/inventory/InventoryManualEditor.tsx` — prop `compact`, affichage des montants d'achat
- `src/hooks/inventory/derived.ts` — fix filtre `missingItems`
