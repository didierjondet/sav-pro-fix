# Performance fournisseurs : détail cliquable et coût RECYCLER

## Constat (Agde)
- Le fournisseur « RECYCLER » a des coûts parce que deux pièces ont un prix d'achat enregistré :
  - SSD 512 Go (30 €) sur le SAV 2026-09-18-004 (type Externe, statut « En attente »)
  - Connecteur de charge Samsung A12 (2 €) sur le SAV 2026-05-27-001 (Interne, clôturé)
- Le tableau fournisseurs compte aussi les SAV non clôturés (ex. « En attente »), alors que les totaux des Rapports ne comptent que les statuts « inclus dans les statistiques ». D'où des coûts qui ne correspondent pas au reste de la page.

## Ce qui change
1. **Mêmes règles que les totaux** : le tableau fournisseurs ne compte plus que les SAV comptés dans les Rapports (même filtre de statut).
2. **Ligne fournisseur cliquable** (flèche ouvrir/fermer) : sous la ligne s'affiche un sous-niveau regroupé **par type de SAV** (nom + couleur du type, nb pièces, nb SAV, dépenses, CA, marge).
3. **Chaque type de SAV s'ouvre à son tour** : liste des SAV concernés (n° de dossier cliquable vers le SAV, client, pièce, quantité, prix d'achat, prix de vente HT, marge).
4. Une pièce avec un prix d'achat alors que le fournisseur est RECYCLER restera visible dans ce détail, ce qui permet de corriger le prix de la pièce (le prix n'est pas forcé à 0 automatiquement).
5. Rien d'autre modifié sur la page ; l'impression garde le tableau fermé.

## Détails techniques
- `useSupplierReportData.ts` : ignorer `item.counted === false` ; construire pour chaque fournisseur `byType: Map<sav_type, { totaux, lines[] }>` avec lignes `{ sav_id, case_number, customer, part_name, quantity, purchase, revenueHT, margin }`.
- `SupplierPerformanceSection.tsx` : état `openSuppliers`/`openTypes` (Set), lignes imbriquées dans le même `Table`, libellé/couleur via `useShopSAVTypes().allTypes`, lien vers la page SAV existante, classe `print:hidden` sur les sous-lignes.
