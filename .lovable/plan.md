# Zones de stockage pour les pièces + inventaire par zone

## Ce que vous obtiendrez
- **Zones de stockage** propres à chaque magasin (ex. « Étagère A – Niveau 2 », « Tiroir 3 ») avec : nom, code court d'identification (ex. `A2`), description facultative, couleur, et zone parente facultative (Armoire > Étagère > Bac).
- **Depuis une pièce** (formulaire de pièce dans Stock) : un sélecteur de zone avec recherche, et directement dedans « + Créer une zone » et un crayon pour modifier la zone choisie — sans quitter la pièce.
- **Dans la liste Stock** : un badge de zone sur chaque pièce (code + couleur), un filtre par zone (y compris « Sans zone »), et une action groupée « Attribuer une zone » sur plusieurs pièces sélectionnées.
- **Gestion des zones** : écran dédié (Paramètres > Stock & partenaires > Zones de stockage) pour créer, modifier, supprimer ; nombre de pièces par zone affiché. Supprimer une zone ne supprime aucune pièce : elles passent « Sans zone » (confirmation avec le nombre de pièces concernées).
- **Étiquette de zone imprimable** (code-barres Code 128 du code de zone) à coller sur l'étagère, au même format d'étiquette que les pièces.
- **Inventaire par zone** : au lancement d'un inventaire, choix « Par catégorie » ou « Par zone » (une ou plusieurs zones, ou « Sans zone »). Seules les pièces de ces zones sont comptées. La zone s'affiche sur chaque ligne d'inventaire et les lignes sont triées par zone pour suivre l'étagère.
- La zone apparaît aussi là où on cherche une pièce pour un SAV/devis/commande (petit badge), pour savoir où aller la prendre.

## Détails techniques
- Nouvelle table `storage_zones` (shop_id, name, code unique par magasin, description, color, parent_id, sort_order, timestamps) avec GRANT + RLS par `get_current_user_shop_id()`.
- `parts.storage_zone_id` (FK `ON DELETE SET NULL`, index).
- `inventory_sessions.zone_filter jsonb` ; `begin_inventory_session` accepte `_zone_ids uuid[]` (et un booléen « sans zone ») en plus de `_category_ids`, filtre identique côté SQL.
- Hook `useStorageZones` (CRUD + compteurs), composant réutilisable `StorageZonePicker` (combobox avec création/édition inline via `StorageZoneDialog`), `StorageZonesManager` dans Paramètres, intégration `PartForm`, `Parts.tsx` (badge, filtre, action groupée), `useInventory` et dialogue de création d'inventaire.
- Pas de changement visuel en dehors de ces ajouts.
