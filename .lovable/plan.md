
# Plan de correction : Statistiques faussées par les conversions devis → SAV

## Diagnostic confirmé

### Problèmes identifiés

**1. Pièces non transférées quand stock = 0**

Dans `src/pages/Quotes.tsx` (lignes 445-472), quand une pièce du devis n'a pas de stock disponible :
- Le code crée une commande dans `order_items`
- Mais il ne crée **PAS** d'entrée dans `sav_parts`
- Résultat : le SAV a un `total_cost` mais aucune pièce, donc aucun coût d'achat traçable

Exemples concrets dans la base :
- SAV `2026-01-02-008` : total_cost = 189.99€, 0 pièces dans sav_parts
- SAV `2026-01-26-003` : converti depuis devis DEV-2026-01-20-001, 0 pièces

**2. Mauvaise source pour les prix d'achat dans les statistiques**

`useStatistics.ts` (ligne 422) :
```typescript
const partCost = (savPart.part?.purchase_price || 0) * savPart.quantity;
```
Problème : utilise le prix actuel du catalogue (`parts.purchase_price`) au lieu du prix stocké dans `sav_parts.purchase_price`

`useMonthlyStatistics.ts` (ligne 79) :
```typescript  
const purchase = Number(savPart.parts?.purchase_price) || 0;
```
Même problème : utilise `parts.purchase_price` au lieu de `sav_parts.purchase_price`

**3. Le hook `useSAVPartsCosts` est correct**

Il utilise bien `item.purchase_price` directement depuis `sav_parts`.

---

## Corrections à apporter

### Fichier 1 : `src/pages/Quotes.tsx`

**Objectif** : Toujours créer une entrée `sav_parts` même quand le stock est insuffisant

**Modification** (lignes 445-472) :

Avant :
```typescript
if (availableStock >= requestedQuantity) {
  // Stock suffisant - insérer dans sav_parts
  partsToInsert.push({...});
} else {
  // Stock insuffisant - créer commande SEULEMENT
  if (availableStock > 0) {
    partsToInsert.push({...}); // Stock partiel
  }
  ordersToInsert.push({...}); // Commande
}
```

Après :
```typescript
// TOUJOURS créer l'entrée sav_parts pour tracer les coûts
partsToInsert.push({
  sav_case_id: savCaseId,
  part_id: item.part_id!,
  quantity: requestedQuantity,
  time_minutes: 0,
  unit_price: item.unit_public_price || 0,
  purchase_price: item.unit_purchase_price ?? null,
});

if (availableStock < requestedQuantity) {
  // Créer commande pour pièces manquantes
  ordersToInsert.push({...});
}
```

### Fichier 2 : `src/hooks/useStatistics.ts`

**Objectif** : Utiliser le `purchase_price` stocké dans `sav_parts` en priorité

**Modification** (ligne 422) :

Avant :
```typescript
const partCost = (savPart.part?.purchase_price || 0) * savPart.quantity;
```

Après :
```typescript
const partCost = (savPart.purchase_price ?? savPart.part?.purchase_price ?? 0) * savPart.quantity;
```

### Fichier 3 : `src/hooks/useMonthlyStatistics.ts`

**Objectif** : Utiliser le `purchase_price` stocké dans `sav_parts` en priorité

**Modification** (ligne 79) :

Avant :
```typescript
const purchase = Number(savPart.parts?.purchase_price) || 0;
```

Après :
```typescript
const purchase = Number(savPart.purchase_price ?? savPart.parts?.purchase_price) || 0;
```

---

## Impact des corrections

| Avant | Après |
|-------|-------|
| Pièces perdues si stock = 0 | Toujours tracées dans sav_parts |
| Coûts = prix catalogue actuel | Coûts = prix au moment du devis |
| Statistiques sous-estimées | Statistiques précises |
| Marges gonflées artificiellement | Marges réelles |

---

## Données historiques

Les SAV déjà convertis avec le bug (sans pièces) resteront sans pièces dans `sav_parts`. Pour les récupérer, il faudrait un script de migration qui :
1. Retrouve les devis archivés liés à un SAV (`sav_case_id` non null)
2. Vérifie si le SAV a des pièces
3. Si non, recrée les entrées `sav_parts` depuis les `items` du devis

Cette migration optionnelle peut être faite ultérieurement si nécessaire.

---

## Fichiers modifiés

1. **`src/pages/Quotes.tsx`** - Correction de la logique de transfert des pièces
2. **`src/hooks/useStatistics.ts`** - Utilisation de `sav_parts.purchase_price` en priorité
3. **`src/hooks/useMonthlyStatistics.ts`** - Utilisation de `sav_parts.purchase_price` en priorité
