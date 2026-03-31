

## Plan : 3 corrections dans les Paramètres

### 1. Supprimer l'onglet Fournisseurs des paramètres

**Fichier : `src/pages/Settings.tsx`**
- Retirer l'import de `SupplierConfigCard` et `useSuppliers`
- Retirer l'import de l'icône `Truck`
- Retirer le `TabsTrigger value="suppliers"` (lignes 712-715)
- Retirer le `TabsContent value="suppliers"` (lignes 1843-1868)
- Retirer la déstructuration de `useSuppliers()` (lignes 128-134)

Les fichiers `useSuppliers.ts`, `SupplierConfigCard.tsx` et `SupplierPartsSearch.tsx` restent intacts car la recherche fournisseur dans les devis en dépend encore.

### 2. Améliorer la barre d'onglets responsive

**Fichier : `src/pages/Settings.tsx`**
- Remplacer la `TabsList` actuelle (simple `flex overflow-x-auto`) par une barre avec scroll horizontal visible et indicateurs visuels (gradient/ombre) sur les bords quand il y a du contenu masqué
- Sur mobile : afficher uniquement les icônes (déjà en place via `hidden sm:inline`) + s'assurer que le scroll fonctionne bien avec `-webkit-overflow-scrolling: touch`
- Sur desktop : ajouter des ombres/fade sur les bords gauche/droit pour signaler qu'il y a d'autres onglets à faire défiler, ou bien passer les onglets sur 2 lignes avec `flex-wrap`

Approche retenue : `flex-wrap` pour que tous les onglets soient visibles sans scroll caché.

### 3. Filtrer les utilisateurs par boutique

**Fichier : `src/pages/Settings.tsx`** — fonction `fetchProfiles`
- Ajouter `.eq('shop_id', profile?.shop_id)` à la requête pour ne charger que les utilisateurs de la boutique courante
- Cela corrige aussi le cas du super admin en mode impersonation, car `profile?.shop_id` renvoie le shop_id effectif (celui de la boutique impersonnée)
- S'assurer que `fetchProfiles` ne s'exécute que quand `profile?.shop_id` est disponible

### Fichiers modifiés

- `src/pages/Settings.tsx` uniquement (les 3 corrections sont dans ce fichier)

### Aucun risque de casse

- `useSuppliers` et `SupplierConfigCard` ne sont pas supprimés, ils restent utilisés dans `SupplierPartsSearch.tsx`
- Les autres onglets et fonctionnalités ne sont pas touchés
- Le filtrage par `shop_id` s'appuie sur la valeur effective du profil déjà en place

