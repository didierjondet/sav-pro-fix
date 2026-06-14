
## Constat (vérifié en base)

- **43 pièces** ont actuellement `reserved_quantity` > ce que justifient les SAV non clôturés (au total **49 unités fantômes**), dont la pièce Xiaomi 13 réf `3667075030294`.
- Cause : le trigger `handle_sav_part_stock_reservation` ne décrémente `reserved_quantity` que sur `DELETE` de `sav_parts`. Quand un SAV passe en statut final (`ready`, `delivered`, `cancelled`, ou statut custom marqué `is_final_status`) sans suppression des lignes `sav_parts`, la réservation reste collée à la pièce.
- Fixy n'a pas d'outils suffisamment larges pour interroger lui-même le stock/les réservations et croiser avec les SAV ouverts.

## Plan

### 1. Correction de fond côté base (migration)

a. **Trigger `release_part_reservations_on_final_status`** (`BEFORE UPDATE ON sav_cases`) : quand `status` bascule vers un statut final (`ready`, `delivered`, `cancelled`, ou un statut custom `shop_sav_statuses.is_final_status = true`), décrémente `parts.reserved_quantity` pour chaque `sav_parts` du dossier (avec `GREATEST(0, …)`). Évite les futurs fantômes.

b. **Fonction `recalculate_part_reservations(p_shop_id uuid DEFAULT NULL)`** (SECURITY DEFINER) : recalcule `parts.reserved_quantity` = somme des `sav_parts.quantity` rattachées à des SAV non finaux. Utilisable globalement, par boutique, ou par admin via bouton.

c. **Fonction `list_ghost_reserved_parts(p_shop_id uuid)`** (SECURITY DEFINER, scoping `shop_id`) : retourne `id, name, reference, sku, reserved_quantity, expected_reserved, ghost_units` pour les pièces dont la réservation dépasse la réalité.

d. **One-shot de nettoyage** dans la migration : `SELECT recalculate_part_reservations();` pour assainir les 49 unités fantômes existantes.

### 2. UI Stock (`src/pages/Parts.tsx` + petit hook)

- Sur la pastille existante "Réservé : X", si la pièce a des unités fantômes (hook `useGhostReservations` → RPC `list_ghost_reserved_parts`), afficher un badge orange "⚠ fantôme" avec tooltip "X unités réservées sans SAV ouvert".
- Nouveau bouton discret (admin uniquement) en haut de la page Stock : **"Recalculer les réservations"** → RPC `recalculate_part_reservations(shop_id)` puis refetch.
- Aucune autre modification visuelle.

### 3. Fixy / HelpBot — montée en compétence générale

L'objectif n'est PAS de patcher Fixy uniquement pour ce cas, mais d'élargir durablement son périmètre d'analyse. Dans `supabase/functions/help-bot/index.ts`, étendre la liste des `tools` exposés au LLM avec un set cohérent d'outils lecture seule (scopés au `shop_id` du contexte) :

**Stock & pièces**
- `list_ghost_reserved_parts` — pièces avec réservation orpheline (utile pour la question d'origine, mais aussi pour les audits).
- `list_parts_by_reservation` — pièces dont `reserved_quantity > 0`, avec détail des SAV qui les réservent.
- `list_low_stock_parts` — pièces sous le seuil `min_stock`.
- `list_dead_stock_parts` — pièces sans mouvement depuis N jours (paramètre).
- `get_part_details` — fiche pièce complète + SAV qui l'utilisent (ouverts + historique récent).

**SAV & flux**
- `list_open_savs_for_part` — quels SAV ouverts consomment une pièce donnée.
- `list_savs_without_parts` — SAV ouverts sans pièce associée.
- `list_long_running_savs` — SAV ouverts depuis > N jours (paramètre).
- `summarize_sav_pipeline` — comptages par statut/type pour vue d'ensemble.

**Commandes & fournisseurs**
- `list_pending_orders` — commandes pièces en attente.
- `list_top_suppliers` — top fournisseurs sur la période, volume et délai moyen.

**Actions admin (avec garde `is_shop_admin`)**
- `recalculate_part_reservations` — proposé uniquement aux admins pour assainir un cas comme celui-ci.

Et étendre le prompt système : "Tu disposes maintenant d'outils de lecture sur le stock, les pièces, les SAV ouverts, les commandes et les fournisseurs (toujours scopés à la boutique active). Utilise plusieurs outils en chaîne si nécessaire pour répondre à une question d'audit (par ex. croiser pièces réservées et SAV ouverts). Les actions de correction (`recalculate_part_reservations`, …) ne sont proposées qu'aux administrateurs."

Résultat : Fixy gagne en autonomie sur tout l'opérationnel (pas seulement les fantômes de réservation), tout en étant capable de répondre à la question posée.

## Détails techniques

```text
sav_cases.status -> final
        │
        ▼
trigger release_part_reservations_on_final_status
        │  pour chaque sav_parts du dossier :
        ▼
UPDATE parts SET reserved_quantity = GREATEST(0, reserved_quantity - qty)
```

Définition « statut final » utilisée partout :
`status IN ('ready','delivered','cancelled')` **OR** présent dans `shop_sav_statuses` du shop avec `is_final_status = true`.

Inchangé : trigger `handle_sav_part_stock_reservation` (INSERT/UPDATE/DELETE sav_parts), logique commandes/stock négatif, recherche IA des pièces, PDF devis.

## Hors périmètre

- Pas de refonte de la pastille "Réservé".
- Pas de purge des `sav_parts` historiques (on corrige seulement le compteur `parts.reserved_quantity`).
- Pas de nouvelle UI pour Fixy — uniquement de nouveaux outils côté edge function.
