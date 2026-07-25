## Diagnostic

Après lecture de `useOrders.ts` (fonctions `markAsOrdered`, `receiveOrderItem`), de `SAVPartsRequirements.tsx` (calcul du badge « À commander ») et de `PartStatusIcon.tsx`, j'ai identifié plusieurs bugs qui expliquent pourquoi le SAV lié ne se met pas à jour après validation d'une réception.

### Bugs confirmés

1. **`receiveOrderItem` ne libère pas la réservation** — la fonction incrémente bien `parts.quantity` (stock physique) et passe le SAV en `parts_received`, mais elle ne décrémente jamais `parts.reserved_quantity`. La réservation posée à la création du SAV reste active.

2. **Le badge « À commander » se calcule sur le stock disponible et non le stock physique** — dans `SAVPartsRequirements.tsx` :
   ```
   availableStock = physicalStock - reserved_quantity
   needs_ordering = quantitéSAV > availableStock
   ```
   Comme la réservation du SAV lui‑même est comptée dans `reserved_quantity`, la pièce reste marquée « À commander » même après réception. C'est la vraie cause du symptôme visible.

3. **Le statut SAV `parts_received` est appliqué globalement** — même si le SAV a plusieurs pièces et qu'une seule vient d'être réceptionnée, le statut passe à `parts_received`. Idem pour `parts_ordered` dans `markAsOrdered`.

4. **Pas de propagation cross‑page** — quand la réception se fait sur `/orders`, l'écran SAV ouvert ailleurs ne recharge pas ses pièces (pas d'event `parts-stock-updated` émis par `receiveOrderItem`).

5. **Réception partielle mal gérée** — `receiveOrderItem` supprime toujours la ligne `order_items` même si la quantité reçue est inférieure à la quantité commandée.

## Correctifs proposés (uniquement `src/hooks/useOrders.ts` et `src/components/sav/SAVPartsRequirements.tsx`)

### 1. `SAVPartsRequirements.tsx` — logique d'affichage
Remplacer le calcul de `needs_ordering` pour se baser sur le stock **physique** vs la quantité nécessaire pour ce SAV (la réservation du SAV lui‑même ne doit pas se compter contre lui) :
```
needs_ordering = physicalStock < neededQuantity
missing_quantity = max(0, neededQuantity - physicalStock)
```
Effet immédiat : dès que la réception augmente `parts.quantity`, le badge repasse en « Disponible ».

### 2. `useOrders.receiveOrderItem` — libérer la réservation + statut cohérent
- Après incrément de `parts.quantity`, décrémenter `parts.reserved_quantity` de `min(quantityReceived, reserved_quantity)` (la pièce reçue vient combler la réservation posée par le SAV).
- Avant de forcer `status = parts_received`, vérifier qu'il ne reste **aucune** autre ligne `order_items` non reçue pour ce SAV. Sinon laisser le SAV en `parts_ordered`.
- Émettre `window.dispatchEvent(new CustomEvent('parts-stock-updated'))` (déjà fait par `refreshAllData`, mais s'assurer que le SAV ouvert écoute cet event dans `SAVPartsRequirements` pour rappeler `fetchPartsRequirements`).
- Gérer la réception partielle : si `quantityReceived < quantity_needed`, décrémenter `quantity_needed` au lieu de supprimer la ligne.

### 3. `useOrders.markAsOrdered` — statut plus fin
Ne passer le SAV en `parts_ordered` que si toutes les pièces nécessaires du SAV ont maintenant un `order_items.ordered = true` ou sont disponibles en stock. Sinon laisser en `parts_to_order`.

### 4. `SAVPartsRequirements.tsx` — écoute realtime
Ajouter un `useEffect` qui écoute :
- l'event window `parts-stock-updated`,
- un canal Supabase realtime sur `sav_parts` filtré par `sav_case_id` et sur `order_items` filtré par `sav_case_id`,
et rappelle `fetchPartsRequirements` (cleanup avec `supabase.removeChannel`).

## Détails techniques

- Aucun changement de schéma DB requis, uniquement de la logique.
- Les corrections ne touchent pas l'UI de la page `/orders` ni les autres onglets — seul le comportement métier de réception et l'affichage du badge sur la fiche SAV sont modifiés.
- Aucune modification aux composants d'impression, wizard, ou ailleurs.

## Validation

1. Créer un SAV avec une pièce en stock 0 (badge « À commander » attendu).
2. Depuis `/orders`, marquer « Commandé » → SAV passe en `parts_ordered`, badge inchangé.
3. Valider la réception → SAV passe en `parts_received`, `parts.quantity` +1, `reserved_quantity` −1, badge SAV bascule sur « Disponible » sans rechargement manuel.
4. Cas multi‑pièces : réception d'une seule → SAV reste en `parts_ordered`, badge de la pièce reçue devient « Disponible », les autres restent « À commander ».
5. Réception partielle (2 sur 3) → la ligne reste dans l'onglet Réception avec quantité mise à jour.