
## Objectif

Améliorer le document de synthèse imprimable et corriger le bouton « Manquants » qui imprime actuellement toute la liste des pièces.

## Problèmes identifiés

1. **Synthèse imprimable** (`printInventoryDocument` variant `summary`) : ne montre qu'une seule case "Valeur non retrouvée" sans détailler la valeur des ajustements positifs ni proposer un bilan net.
2. **Bouton « Manquants »** (variant `missing`) : le filtre actuel `line_status === 'missing' || (counted_quantity ?? 0) === 0` inclut aussi toutes les pièces non encore traitées (`pending` avec `counted_quantity = null`), donc imprime quasi toute la liste au lieu des seules pièces marquées non trouvées.

## Modifications

### 1. `src/lib/inventoryPrint.ts`

**Filtre « Manquants » plus strict** : ne garder que les lignes dont `line_status === 'missing'` (pièces explicitement marquées non trouvées). Retirer la condition sur `counted_quantity === 0` qui capture les `pending`.

**Calcul de trois nouvelles valeurs financières** (sur l'ensemble `items`, pas `filteredItems`, pour le variant `summary`) :
- `totalMissingValue` : somme de `unit_cost × expected_quantity` pour `line_status === 'missing'` (valeur perdue).
- `totalAdjustedPositiveValue` : somme de `unit_cost × variance_quantity` pour les lignes où `line_status === 'adjusted'` ET `variance_quantity > 0` (surplus trouvés en positif).
- `bilanNet` : `totalAdjustedPositiveValue - totalMissingValue` (positif = gain net, négatif = perte nette).

**Refonte du bloc `.meta` du HTML pour le variant `summary`** :

```text
[ Références ] [ Qté théorique ] [ Qté inventoriée ]
[ Valeur non retrouvée ] [ Valeur ajustée (+) ] [ Bilan net ]
```

Le « Bilan net » sera coloré (rouge si négatif, vert si positif) via une classe inline.

Pour les variants `count-sheet` et `missing`, garder la grille `meta` actuelle simple (4 cases) — pas de bilan nécessaire.

### 2. Aucun autre fichier touché

Les composants React (`InventoryManager`, `InventoryManualEditor`, `InventorySessionSummary`) ne sont pas concernés — le bug et l'amélioration sont 100% dans la fonction de génération HTML d'impression.

## Détails techniques

```ts
// Filtrage corrigé pour le variant 'missing'
const filteredItems =
  variant === 'missing'
    ? items.filter((item) => item.line_status === 'missing')
    : items;

// Calculs financiers (pour summary)
const totalMissingValue = items
  .filter((i) => i.line_status === 'missing')
  .reduce((sum, i) => sum + i.unit_cost * i.expected_quantity, 0);

const totalAdjustedPositiveValue = items
  .filter((i) => i.line_status === 'adjusted' && i.variance_quantity > 0)
  .reduce((sum, i) => sum + i.unit_cost * i.variance_quantity, 0);

const bilanNet = totalAdjustedPositiveValue - totalMissingValue;
```

Affichage HTML supplémentaire (uniquement si `variant === 'summary'`) : une seconde rangée `.meta` avec les 3 cases financières, `bilanNet` stylé `color: #16a34a` (positif) ou `color: #dc2626` (négatif).
