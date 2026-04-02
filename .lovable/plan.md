

## Plan : Mise en évidence visuelle des filtres modifiés

### Principe
Quand un filtre a une valeur différente de sa valeur par défaut, son `SelectTrigger` sera visuellement mis en évidence (bordure et fond coloré) pour alerter le technicien d'un coup d'œil.

### Modification

**Fichier : `src/pages/SAVList.tsx`**

1. **Helper `isModified`** : créer une fonction simple qui compare la valeur actuelle d'un filtre à sa valeur par défaut dans `DEFAULT_FILTERS` :
   ```ts
   const isFilterModified = (key: keyof typeof DEFAULT_FILTERS, value: string | number) => 
     value !== DEFAULT_FILTERS[key];
   ```

2. **Style conditionnel sur chaque `SelectTrigger`** : ajouter une classe conditionnelle `ring-2 ring-orange-400 bg-orange-50` quand le filtre est modifié. Concerne les 5 filtres :
   - Type (`filterType`)
   - Couleur (`colorFilter`)
   - Grade (`gradeFilter`)
   - Statut (`statusFilter`)
   - Tri (`sortOrder`)

   Exemple :
   ```tsx
   <SelectTrigger className={cn("w-40", isFilterModified('filterType', filterType) && "ring-2 ring-orange-400 bg-orange-50")}>
   ```

3. **Import `cn`** : déjà importé dans le fichier via `@/lib/utils`.

### Résultat
- Filtres par défaut → apparence normale
- Filtre modifié → bordure orange + fond légèrement orangé → repérage immédiat
- Le bouton "Réinitialiser" existant remet tout à la normale

### Fichier impacté
- `src/pages/SAVList.tsx`

