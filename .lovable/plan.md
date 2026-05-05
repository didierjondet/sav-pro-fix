## Objectif
Afficher sur chaque carte de pièce détachée la date du dernier inventaire qui a compté cette pièce, et permettre de cliquer dessus pour ouvrir directement le résumé de la session d'inventaire concernée.

## Logique de données

Pour chaque pièce affichée dans `Parts.tsx`, déterminer :
- La dernière session d'inventaire (statut `completed` ou `applied`) où la pièce a été comptée (`counted_at IS NOT NULL`).
- L'`inventory_session_id` correspondant pour permettre la navigation.

Source : table `inventory_session_items` jointe à `inventory_sessions`, filtrée par `shop_id` et statut clôturé/appliqué, agrégé par `part_id` avec MAX(`counted_at`).

## Implémentation

### 1. Nouveau hook `useLastInventoryByPart`
Fichier : `src/hooks/useLastInventoryByPart.ts`
- Requête unique récupérant pour le shop courant : `part_id`, `MAX(counted_at)`, et l'`inventory_session_id` associé.
- Retourne une `Map<part_id, { lastCountedAt: string, sessionId: string, sessionName: string }>`.
- Une seule requête pour toutes les pièces (perf).

### 2. Affichage sur la carte (`src/pages/Parts.tsx`)
Ajouter une 7ᵉ cellule dans la grille d'infos (ou ligne sous le fournisseur) :
- Si données : "Dernier inventaire : `<date formatée>`" en lien cliquable (bouton ghost/link).
- Si aucune : "Jamais inventoriée" en muted.
- Icône `ClipboardCheck` ou `History`.

### 3. Navigation vers le résumé
Au clic sur la date :
- Rediriger vers `/settings` (page Settings) avec un paramètre d'URL, par ex. `?tab=inventory&session=<id>`.
- Adapter `Settings.tsx` / `InventoryManager.tsx` / `InventoryGeneralTab.tsx` pour :
  - Lire le `session` query param au montage.
  - Ouvrir automatiquement la section "Historique des inventaires clôturés" et déplier (`Collapsible`) la session ciblée sur l'onglet **Détails** (résumé).
  - Scroller vers la session.

## Fichiers impactés
- `src/hooks/useLastInventoryByPart.ts` (créé)
- `src/pages/Parts.tsx` (ajout affichage + lien)
- `src/components/settings/inventory/InventoryGeneralTab.tsx` (auto-ouverture via query param)
- éventuellement `src/components/settings/inventory/InventoryManager.tsx` ou `src/pages/Settings.tsx` pour propager le param vers le bon onglet.

## Détails UX
- Format date : `dd/MM/yyyy` (date-fns, locale fr).
- Tooltip sur le lien : "Voir la session : `<nom session>`".
- Si la session est encore `in_progress` on l'ignore (on n'affiche que les inventaires validés).
