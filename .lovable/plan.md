## Vérification des connexions Statut SAV ↔ Page Commandes

### Flux existants (OK — déjà synchronisés)

| Action utilisateur | Effet sur SAV | Effet sur order_items |
|---|---|---|
| Bouton "Commandé" page Commandes | → `parts_ordered` ✅ | INSERT `ordered=true` ✅ |
| Bouton "Valider réception" | → `parts_received` ✅ | DELETE + stock+ ✅ |
| Bouton "Annuler" commande | (libère réservation, message chat) ✅ | DELETE ✅ |
| Bouton "Retirer" page Commandes | Recalcule SAV (pending si vide) ✅ | DELETE / suppr. sav_parts ✅ |

### Flux manquants à corriger

| Action utilisateur | Effet actuel | Effet attendu |
|---|---|---|
| **Carte SAV → statut `parts_ordered`** | rien côté commandes ❌ | INSERT auto dans `order_items` (`ordered=true`) pour chaque `sav_parts` en stock insuffisant |
| **Carte SAV → statut `parts_received`** (depuis `parts_ordered`) | rien côté commandes ❌ | DELETE des `order_items` `ordered=true` du SAV |
| **Carte SAV → autre statut** alors qu'on était en `parts_ordered` | ligne fantôme dans Réception ❌ | DELETE des `order_items` `ordered=true` non reçus |
| **Suppression SAV** (`deleteCase`) | risque ligne orpheline ❌ | DELETE `order_items` liés avant DELETE SAV |
| **Suppression d'une pièce** (`SAVPartsRequirements.removePart`) | ligne fantôme dans Réception si déjà commandée ❌ | DELETE `order_items` `ordered=true` correspondants |

---

## Implémentation

### 1. `src/pages/Orders.tsx` — Suppression onglet Devis
- Retirer `<TabsTrigger value="quotes">`, passer `grid-cols-4` → `grid-cols-3`.
- Retirer `'quotes'` du type `activeFilter` et du `getEmptyMessage`.

### 2. `src/hooks/useOrders.ts`
- Retirer `'quotes'` de la signature de `getOrdersByFilter`.

### 3. `src/hooks/useSAVCases.ts` — fonction `updateCaseStatus`

Au début de la fonction, après avoir récupéré `currentCase` (qui contient déjà `status` et `shop_id`) :

**A. Si `status === 'parts_ordered'` ET `currentCase.status !== 'parts_ordered'`** :
- Récupérer `sav_parts` (avec part_id, quantity) + leur `parts.quantity` physique.
- Pour chaque pièce avec part_id : si stock physique < quantité requise et qu'aucune ligne `order_items` `ordered=true` n'existe pour (`sav_case_id`, `part_id`), INSERT une ligne avec `ordered=true`, `reason='sav_stock_zero'`, `priority='high'`, `quantity_needed = quantity - stock`.

**B. Si `currentCase.status === 'parts_ordered'` ET `status !== 'parts_ordered'`** :
- DELETE les lignes `order_items` `ordered=true` du SAV (la réception via card ou retour en arrière nettoie l'onglet Réception). Le stock physique reste inchangé (pas de réception réelle), sauf si nouveau statut = `parts_received` → on laisse au choix de ne pas auto-incrémenter le stock ici (comportement actuel : seul le bouton "Valider réception" ajoute au stock).

### 4. `src/hooks/useSAVCases.ts` — fonction `deleteCase`
- Avant le `DELETE FROM sav_cases`, faire `DELETE FROM order_items WHERE sav_case_id = ?`.

### 5. `src/components/sav/SAVPartsRequirements.tsx` — fonction `removePart`
- Avant le DELETE `sav_parts`, faire `DELETE FROM order_items WHERE sav_case_id = ? AND part_id = ?`.

---

## Fichiers modifiés
- `src/pages/Orders.tsx`
- `src/hooks/useOrders.ts`
- `src/hooks/useSAVCases.ts`
- `src/components/sav/SAVPartsRequirements.tsx`

Aucune migration SQL nécessaire — la table `order_items` et les RLS existantes (filtrage par `shop_id`) couvrent déjà tous les cas.