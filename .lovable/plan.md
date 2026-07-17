## Problème

Le widget « Répartition du chiffre d'affaires » ne regroupe **pas** le CA par `sav_type` (interne/externe/…), mais par **catégorie de produit** déduite de la marque/modèle : `Téléphones`, `Informatique`, `Consoles`, `Tablettes`, `Autres` (`src/hooks/useStatistics.ts` → `categorizeDevice` + `productCategoryData`).

Or le seul outil finance du bot (`get_finance_summary` dans `supabase/functions/help-bot/index.ts`) :
- regroupe uniquement par `sav_type`,
- calcule le CA à partir de `sav_cases.total_cost` (pas via `sav_parts` + prise en charge + exclusions comme le widget),
- ne peut pas énumérer les SAV derrière un montant.

Résultat : quand on lui demande à quoi correspondent les 240 € de la catégorie « Autres », il n'a ni la bonne granularité, ni les bons chiffres, ni la liste des SAV.

## Solution

Ajouter un outil dédié qui reproduit exactement la logique du widget et permet de drill-down par catégorie, puis apprendre au bot à l'utiliser.

### 1. Nouvelle fonction outil `get_revenue_by_product_category`

Dans `supabase/functions/help-bot/index.ts` :

- **Params** :
  - `period` : `today | week | month | year | custom` (obligatoire)
  - `date_from`, `date_to` (si `custom`)
  - `category` (optionnel) : `Téléphones | Informatique | Consoles | Tablettes | Autres`
  - `include_cases` (bool, défaut `true` si `category` fourni, sinon `false`)
  - `limit` cases (clamp 50, max 200)

- **Logique** (miroir strict de `useStatistics.ts`) :
  1. Charger `shop_sav_types` pour récupérer les listes `excludeFromSalesRevenue` et `excludeFromPurchaseCosts` (mêmes flags qu'aujourd'hui côté front).
  2. Charger les `sav_cases` de la période avec `id, case_number, sav_type, status, device_brand, device_model, total_cost, taken_over, partial_takeover, takeover_amount, created_at, customer:customers(first_name,last_name)` + `sav_parts(unit_price, purchase_price, quantity, part:parts(selling_price, purchase_price))`.
  3. Pour chaque case : calculer `caseRevenue` / `caseCost` via `sav_parts` (avec `unit_price || part.selling_price`, exclusions par `sav_type`), appliquer la prise en charge partielle (ratio) ou totale (`caseRevenue = 0`).
  4. Catégoriser via un helper `categorizeDevice(brand, model)` **identique** à celui du front.
  5. Agréger `{ category → { revenue, count, cases: [...] } }`, trier par revenu décroissant, calculer `percentage`.

- **Retour** :
  ```
  {
    period, from, to,
    total_revenue,
    categories: [
      { category, revenue, count, average_value, percentage }
    ],
    cases?: [   // seulement si category demandée
      { case_number, customer_name, device_brand, device_model,
        sav_type, status, revenue, created_at }
    ]
  }
  ```

### 2. Helper partagé pour la catégorisation

Créer `supabase/functions/_shared/deviceCategory.ts` avec la fonction `categorizeDevice(brand, model)` — copie fidèle de `src/hooks/useStatistics.ts` (mêmes listes de marques, mêmes regex, même fallback `'Autres'`). Utilisé uniquement par le help-bot ; `useStatistics.ts` reste inchangé (pas de refacto côté front demandée).

### 3. Déclaration de l'outil + prompt

- Ajouter la déclaration `tool` (`name`, `description`, `parameters`) dans le tableau `tools` de `help-bot/index.ts`.
- Ajouter la branche `case 'get_revenue_by_product_category'` dans `runTool`.
- Compléter le prompt système :
  - Nouvelle règle : *« Le widget "Répartition du chiffre d'affaires" regroupe le CA par catégorie de produit (Téléphones, Informatique, Consoles, Tablettes, Autres) déduite de la marque/modèle, PAS par sav_type. Pour toute question portant sur ce widget ou sur une catégorie produit, utiliser `get_revenue_by_product_category`. Ne PAS utiliser `get_finance_summary` (qui regroupe par sav_type interne/externe). »*
  - Consigne de drill-down : *« Si l'utilisateur demande à quoi correspond un montant d'une catégorie (ex. 240 € en "Autres"), rappeler `get_revenue_by_product_category` avec `category` renseignée pour lister les SAV contributifs. »*

### 4. Hors périmètre

- Aucune modification du widget ni de `useStatistics.ts`.
- Aucune modification de `get_finance_summary` (conservé pour les questions par `sav_type`).
- Pas de nouvelle table, pas de migration.

## Fichiers touchés

- `supabase/functions/help-bot/index.ts` (déclaration outil, prompt, branche runTool)
- `supabase/functions/_shared/deviceCategory.ts` (nouveau)
