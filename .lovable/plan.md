# Réservations fantômes & élargissement Fixy — Implémenté

## Base
- Trigger `release_part_reservations_on_final_status` (BEFORE UPDATE OF status sur `sav_cases`) : libère / re-réserve les pièces quand le SAV bascule vers / depuis un statut final (built-in ou custom via `shop_sav_statuses.is_final_status`).
- Fonction `recalculate_part_reservations(p_shop_id uuid)` : recalcule `parts.reserved_quantity` depuis les SAV non finaux. Gate admin si scope shop.
- Fonction `list_ghost_reserved_parts(p_shop_id)` : pièces avec `reserved_quantity > expected`.
- Nettoyage one-shot exécuté dans la migration.

## UI Stock
- `useGhostReservations` hook (`src/hooks/useGhostReservations.ts`).
- Badge orange `Fantôme: N` à côté du badge `Réservé`.
- Bouton admin `Recalculer réservations (N)` dans la toolbar de la page Stock.

## Fixy (help-bot)
Nouveaux tools : `list_ghost_reserved_parts`, `list_parts_by_reservation`, `list_low_stock_parts`, `list_open_savs_for_part`, `list_savs_without_parts`, `list_long_running_savs`, `summarize_sav_pipeline`, `list_pending_orders`, `recalculate_part_reservations` (admin). Prompt système mis à jour.
