---
name: Realtime stock propagation
description: Stock updates (parts table) propagate live to SAV cards, SAV editor and Quote form via Supabase realtime + parts-stock-updated CustomEvent fallback
type: feature
---
- `public.parts` est dans la publication `supabase_realtime` (REPLICA IDENTITY FULL).
- `useParts`, `SAVPartsRequirements`, `SAVPartsEditor` souscrivent à `postgres_changes` sur `parts` et écoutent `window` event `parts-stock-updated`.
- `useOrders.refreshAllData()` dispatche `parts-stock-updated` après réception/annulation pour servir de fallback si realtime est indisponible.
- `SAVPartsRequirements` calcule désormais `available_stock = max(0, quantity - reserved_quantity)` (cohérent avec `SAVPartsEditor`).
