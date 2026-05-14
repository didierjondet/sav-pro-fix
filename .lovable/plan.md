# Correction des PDF d'inventaire (Synthèse + Manquants)

## Diagnostic

Les PDF passent par `src/lib/inventoryPrint.ts` → `printInventoryDocument`.
Les filtres "manquant" et "ajusté" reposent sur `item.line_status === 'missing'` / `'adjusted'`.

Or, dès que l'inventaire est **appliqué** (`status = applied`, ce qui est le cas de "Batterie iphone"), la fonction `apply_inventory_session` réécrit tous les statuts de lignes à `'applied'`. Conséquence :

- "Valeur non retrouvée" = 0,00 €
- "Valeur ajustée (positif)" = + 0,00 €
- "Bilan net" = + 0,00 €
- Le document **Produits non retrouvés** ne contient aucune ligne

Alors que les écarts (ex. -42 €, -32 €, +24 €…) sont bien stockés dans `variance_quantity` / `variance_value` / `is_missing`.

## Correctifs (uniquement `src/lib/inventoryPrint.ts`)

1. **Helpers de classification robustes au statut `applied`** :
   - `isMissing(item)` = `item.is_missing === true` **ou** (`(item.counted_quantity ?? 0) === 0` && `item.expected_quantity > 0` && `item.variance_quantity < 0`) **ou** `item.line_status === 'missing'`.
   - `isAdjustedPositive(item)` = `item.variance_quantity > 0`.

2. **Filtre du variant `missing`** : utiliser `isMissing(item)` au lieu de `line_status === 'missing'`. → Le PDF "Produits non retrouvés" affichera enfin les 2 références manquantes (ex. iPhone 11 -42 €, iPhone 13 -32 €).

3. **Bilan financier de la synthèse** :
   - `totalMissingValue` = somme de `unit_cost * expected_quantity` sur `items.filter(isMissing)`.
   - `totalAdjustedPositiveValue` = somme de `unit_cost * variance_quantity` sur `items.filter(isAdjustedPositive)`.
   - **Nouveau** : `ecartGlobal` = somme de `item.variance_value` sur tous les items (= -13,48 € attendu pour cet inventaire).
   - `bilanNet` reste l'agrégat positifs − manquants, mais affiché à côté de `ecartGlobal`.

4. **Bandeau du haut (4 cases)** : remplacer la case "Valeur non retrouvée" (toujours négative et redondante) par **"Écart global"** qui affiche `currency(ecartGlobal)` colorée en rouge si négatif, vert si positif. Les cases Références / Qté théorique / Qté inventoriée sont conservées.

5. **Bandeau secondaire de la synthèse** (3 cases) : conserver Valeur produits non retrouvés / Valeur ajustée positive / Bilan net, mais alimentés par les nouveaux helpers afin d'être cohérents avec le tableau et avec `session.variance_total_cost`.

6. **Variant `missing`** : la case "Valeur non retrouvée" en haut affiche `totalMissingValue` (somme `unit_cost * expected_quantity` des items filtrés). La table liste désormais les vraies lignes manquantes.

Aucune modification SQL, aucune autre page touchée.

## Vérification attendue après correction

Sur l'inventaire "Batterie iphone" :
- Synthèse → Écart global ≈ **-13,48 €**, Valeur manquants ≈ **74,00 €**, Valeur ajustée positive ≈ **60,52 €** (cohérent avec `bilanNet ≈ -13,48 €`).
- Produits non retrouvés → 2 lignes (iPhone 11 batterie, iPhone 13 batterie) avec leurs valeurs.
