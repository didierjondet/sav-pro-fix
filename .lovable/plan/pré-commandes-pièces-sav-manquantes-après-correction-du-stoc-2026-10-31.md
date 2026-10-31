# Pré-commandes : pièces SAV manquantes après correction du stock

## Ce que montre la base
- Écran **iPhone 15 Plus (LTPS)** : stock physique 1, réservé 1, utilisé par le SAV 2026-10-31-001 (en attente). Dans le SAV on voit « 0 » parce que c'est le **disponible** (1 − 1 réservé). La page Pré-commande, elle, compare au **stock physique** (1) : elle considère donc la pièce couverte et ne l'affiche pas.
- Écran **iPhone 15 Pro Max 120 Hz** : stock 1, mais il est utilisé par **3 SAV ouverts** (2026-10-30-005, 2026-10-10-003, 2026-08-21-008). Chaque SAV est comparé seul au stock (1 ≥ 1), donc aucun n'apparaît alors qu'il en manque 2. C'est le vrai bug, et il explique l'impression que « d'autres pièces n'apparaissent plus ».
- Les SAV aux statuts personnalisés (ex. « diagnostique ») ne sont jamais vérifiés, car la liste des statuts pris en compte est figée.
- La page ne se met pas à jour toute seule : une correction de stock faite dans un autre onglet n'est visible qu'en rechargeant.
- Aucune limite d'affichage ou de pagination ne cache des lignes sur la page.

## Corrections proposées
1. **Calcul par pièce, en cumulant tous les SAV ouverts** : on additionne la quantité demandée par tous les SAV ouverts pour une même pièce et on compare ce total au stock physique. Les pièces sont attribuées aux SAV du plus ancien au plus récent, et les SAV qui ne sont pas couverts apparaissent en pré-commande, chacun sur sa ligne.
2. **SAV ouvert = tout statut non final** (en se basant sur les statuts configurés du magasin) au lieu de la liste figée. Les statuts personnalisés comme « diagnostique » seront donc pris en compte.
3. **Mise à jour automatique** : la page Pré-commande se recalcule en direct dès qu'un stock, une pièce de SAV ou une commande change, et aussi au retour sur l'onglet.
4. **Mise à zéro du stock** : dès qu'on passe une pièce à 0 sur la page Stock, ses SAV en attente réapparaissent tout de suite en pré-commande. C'est le résultat direct des points 1 et 3.
5. Les lignes déjà marquées « commandé » restent exclues, comme aujourd'hui.

## Détails techniques
- `src/hooks/useOrders.ts` › `fetchPartsNeededForSAV` : on récupère les statuts finaux du magasin (`shop_sav_statuses`), on filtre les `sav_parts` des dossiers non finaux, on regroupe par `part_id`, puis on attribue `parts.quantity` aux SAV par `created_at` croissant. Les SAV dont la quantité n'est pas couverte deviennent des lignes avec `quantity_needed` égal au reste à couvrir.
- Abonnement Realtime (dans un `useEffect`, avec nettoyage) sur `parts`, `sav_parts` et `order_items` du magasin, plus une actualisation au `visibilitychange`. Si Realtime n'est pas activé sur ces tables, une migration les ajoute à la publication.
- On extrait la règle d'attribution dans une fonction pure (`src/lib/orderNeeds.ts`) et on la couvre par un test : stock 1 pour 3 SAV ⇒ 2 lignes ; stock 0 ⇒ toutes les lignes ; statut final ignoré.
