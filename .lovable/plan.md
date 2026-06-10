## Objectif

Sur Paramètres → onglet « Logs » (Journal d'activité), rendre les lignes liées à un SAV beaucoup plus lisibles et permettre la recherche.

## Changements

### 1. `src/hooks/useActivityLogs.ts`
- Récupérer les détails des SAV référencés par les logs au lieu d'afficher uniquement les 8 premiers caractères de l'UUID.
- Après le fetch de `sav_audit_logs`, collecter les `sav_case_id` distincts puis une requête `sav_cases` jointe à `customers` :
  - `case_number`
  - `device_brand`, `device_model`
  - `customer:customers(first_name, last_name)`
- Étendre `ActivityLogEntry` avec 3 champs optionnels : `case_number?: string`, `customer_name?: string`, `device_label?: string`.
- Pour chaque entrée SAV, peupler ces champs ; pour inventory/email, les laisser vides.
- Remplacer la valeur actuelle de `target` pour les SAV par le `case_number` (ex. `SAV-2026-00042`) au lieu de `SAV 93c60b1f`.

### 2. `src/pages/Settings.tsx` (panneau Journal d'activité, lignes ~140-285)
- Ajouter un state `search` et un `Input` (icône `Search`) placé à gauche du compteur d'entrées.
- Filtrer `logs` côté client via `multiWordSearch` (déjà dispo dans `src/utils/searchUtils.ts`) sur : `actor`, `action`, `target`, `details`, `case_number`, `customer_name`, `device_label`.
- Réinitialiser `page` à 0 quand `search` change.
- Ajouter deux colonnes au tableau, entre « Source » et « Utilisateur » :
  - `N° SAV` → affiche `l.case_number` (font-mono) ou `—`
  - `Client` → affiche `l.customer_name` ou `—`
- Mettre à jour le `colSpan` de la ligne "Aucune action" (6 → 8).
- Inclure ces deux colonnes dans l'export CSV.

## Hors scope
- Aucun changement de logique métier, de schéma DB, ni d'autres écrans.
- Les colonnes existantes (Date, Source, Action, Cible, Détails) restent identiques visuellement.
