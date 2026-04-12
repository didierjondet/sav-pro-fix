

## Plan : Corriger le calcul du benefice client avec les vrais couts d'achat

### Probleme identifie

Dans `src/hooks/useCustomerActivity.ts`, ligne 77-81 :
```typescript
profit = revenue * 0.3; // Estimation 30% de marge
```

Le hook ne recupere jamais les pieces (`sav_parts`) du SAV. Il applique un pourcentage fixe de 30% au lieu de calculer :
- **CA** = somme des `unit_price * quantity` des pieces
- **Cout d'achat** = somme des `purchase_price * quantity` des pieces
- **Marge/Profit** = CA - Cout d'achat

### Correction dans `src/hooks/useCustomerActivity.ts`

1. **Ajouter une requete `sav_parts`** pour chaque SAV du client, en recuperant `unit_price`, `purchase_price`, `quantity`

2. **Remplacer la logique de calcul** :
   - `revenue` = somme des `unit_price * quantity` (au lieu de `total_cost`)
   - `purchase_cost` = somme des `purchase_price * quantity`
   - `profit` = `revenue - purchase_cost`
   - Tenir compte de la prise en charge (totale/partielle) pour ajuster le CA comme dans les autres hooks

3. **Approche technique** : Faire une seule requete groupee sur `sav_parts` filtree par les IDs des SAV du client, puis repartir les couts par `sav_case_id`

### Ce qui ne change pas
- `CustomerActivityDialog.tsx` — l'affichage reste identique, seules les valeurs seront correctes
- La logique des devis (pas de pieces, donc pas de changement)

### Fichier impacte
- `src/hooks/useCustomerActivity.ts` — ajout de la requete `sav_parts` et remplacement du calcul estime par le calcul reel

