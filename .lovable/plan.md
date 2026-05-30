# Confirmation

Oui, le suivi produit est bien en place :
- Table `tracked_products` (clé IMEI ≥10 caractères, fallback SKU/marque-modèle) avec compteur `sav_count`.
- Colonne `sav_cases.tracked_product_id` + fonction `find_or_create_tracked_product` appelée à la création d'un SAV.
- Hooks `useProductHistory` / `useProductHistoryById` qui ramènent la fiche produit + tous les anciens SAV.
- UI déjà visible : `ProductHistoryBanner`, `ProductRecurrenceBadge`, `ProductHistoryDrawer` lors d'une création/édition de SAV.

Donc dès qu'un IMEI (ou à défaut SKU) est reconnu, l'historique complet est rattaché et consultable.

# Ce qu'on ajoute

## 1. Calcul "taux de retour" (logique partagée)

Nouveau helper `src/lib/productReturnRate.ts` qui, à partir de la liste des SAV d'un produit, calcule :
- **Nb total de passages** = nombre de SAV clôturés sur ce produit.
- **Retours** = SAV créé < N jours après la clôture d'un SAV précédent du même produit (fenêtre configurable, défaut 90 j).
- **Retour même panne** = retour dont le `problem_description` partage des mots-clés normalisés avec un SAV précédent (normalisation accents/ponctuation + matching sur tokens significatifs ≥ 4 caractères, seuil ≥ 1 token commun + même famille via heuristique simple). Sinon → **retour autre panne**.
- Sorties : `{ totalCases, returnCount, sameIssueCount, otherIssueCount, returnRate, sameIssueRate }`.

Aucune migration nécessaire : tout est dérivé des SAV existants.

## 2. Affichage dans la fiche produit (drawer existant)

Dans `ProductHistoryDrawer` :
- Ajouter en haut un bloc compact "Récurrence" avec 3 KPI : Taux de retour global, Taux retour même panne, Nb de réparations.
- Sur chaque ligne de SAV de l'historique, badge discret : "1er passage", "Retour (même panne)" ou "Retour (autre panne)".

Aucune autre UI modifiée.

## 3. Nouveau widget statistiques "Taux de retour produit"

- Nouveau widget `ProductReturnRateWidget` (taille `large`) listant sur la période sélectionnée :
  - 3 KPI : retours totaux, retours même panne, retours autre panne (avec %).
  - Top 5 des produits les plus récurrents (marque/modèle + IMEI masqué + nb retours).
- Nouvelle entrée dans `StatisticsWidgetSizes.ts` (`DEFAULT_MODULE_SIZES`) et dans la liste de widgets disponibles (`WidgetManager` / registry existant).
- Données : `sav_cases` joints à `tracked_products` filtrés par `shop_id` et `created_at` dans la période, agrégés avec le helper.

## Hors-scope

- Pas de modification de la grille/dimensionnement des widgets (sujet précédent).
- Pas de changement de schéma DB.
- Pas de modification du flow de création SAV ni du matching IMEI/SKU déjà en place.

# Détails techniques

```text
src/lib/productReturnRate.ts            (nouveau)
src/components/sav/ProductHistoryDrawer.tsx        (ajout bloc KPI + badges)
src/components/statistics/widgets/ProductReturnRateWidget.tsx  (nouveau)
src/components/statistics/StatisticsWidgetSizes.ts (ajout id 'product-return-rate' → 'large')
src/components/statistics/WidgetManager.tsx        (enregistrement)
src/hooks/useProductReturnStats.ts                 (nouveau, agrégation période + shop)
```

Heuristique "même panne" volontairement simple et déterministe (tokens normalisés) pour rester lisible ; ajustable plus tard si besoin.
