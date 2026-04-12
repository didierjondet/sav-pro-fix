

## Plan : Recherche respecte les filtres + statut "Tous" par defaut

### Ce qui change

**1. Le statut par defaut devient `"all"` (Tous les statuts)**

Dans `DEFAULT_FILTERS`, remplacer `statusFilter: 'all-except-ready'` par `statusFilter: 'all'`.

Consequence : par defaut, aucun statut n'est exclu. Le bouton "Reinitialiser" remettra aussi ce filtre a `"all"`. Le filtre "Tous les statuts" ne sera pas mis en evidence en orange (car c'est la valeur par defaut). Tout autre choix de statut (y compris "Masquer les prets") sera mis en evidence en orange.

**2. La recherche respecte toujours les filtres**

Supprimer la logique `isUnfilteredSearch` (lignes 264-271) et le bloc conditionnel `if (!isUnfilteredSearch)` (ligne 275). Les filtres s'appliqueront toujours, que le champ de recherche soit vide ou non.

Si l'utilisateur veut chercher dans tous les statuts, il lui suffit de laisser le filtre statut sur "Tous les statuts" (le defaut).

### Fichier impacte

- **`src/pages/SAVList.tsx`** :
  - Ligne 59 : `statusFilter: 'all'` au lieu de `'all-except-ready'`
  - Lignes 264-275 : supprimer la variable `hasActiveFilters`, `isUnfilteredSearch`, et le `if (!isUnfilteredSearch)` — les filtres s'appliquent toujours directement
  - Retirer le bloc conditionnel pour que les filtres type/statut/couleur/grade soient toujours evalues

### Resultat attendu

- Par defaut : statut = "Tous", aucune mise en evidence orange
- L'utilisateur choisit "Masquer les prets" → fond orange sur le filtre statut
- La recherche filtre toujours dans le contexte des filtres actifs
- Le bouton reinitialiser remet tout a "Tous les statuts"

