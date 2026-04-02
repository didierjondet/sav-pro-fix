

## Plan : Corriger la logique de stock insuffisant dans l'onglet SAV des commandes

### Probleme
Dans `fetchPartsNeededForSAV` (ligne 135 de `useOrders.ts`), le calcul du stock disponible soustrait `reserved_quantity` du stock total. Or `reserved_quantity` inclut deja la reservation faite pour CE meme SAV. Resultat : une piece avec stock=5, reserved=3 (pour ce SAV), besoin=3 → stock disponible calcule = 2 < 3 → la piece apparait comme manquante alors que le stock physique est suffisant.

### Correction

**Fichier : `src/hooks/useOrders.ts`** (ligne 133-136)

Remplacer le calcul du stock disponible par une verification du stock physique brut (`quantity`) contre la quantite necessaire. Si le stock physique couvre le besoin, la piece ne doit pas apparaitre :

```ts
const formattedSavParts = savParts?.filter(item => {
  // Ne montrer que les pièces dont le stock physique est insuffisant
  const physicalStock = item.parts.quantity || 0;
  if (physicalStock >= item.quantity) return false;
  // ...
```

La `reserved_quantity` sert a calculer le stock disponible pour de NOUVELLES reservations, pas a verifier si une reservation existante est couverte. Si le stock physique >= quantite necessaire, le travail peut etre fait.

### Fichier impacte
- `src/hooks/useOrders.ts`

