

## Plan : Remplacer la recherche fournisseur par une recherche rapide de stock

### Ce qui sera fait

1. **Supprimer `SupplierPartsSearch`** de la page Devis (`src/pages/Quotes.tsx` ligne 701) et son import (ligne 15)

2. **Remplacer par un champ de recherche rapide de pièces en stock** directement dans la page Devis, au même emplacement. Ce champ permettra de :
   - Taper un nom ou une référence de pièce
   - Voir instantanément les résultats avec : nom, référence, stock disponible (quantité - réservée), prix de vente, et un indicateur visuel (vert = en stock, rouge = rupture)
   - Cliquer sur une pièce pour voir ses détails sans quitter la page

3. **Supprimer le fichier `SupplierPartsSearch.tsx`** car il ne sera plus utilisé nulle part

### Fichiers impactés
- `src/pages/Quotes.tsx` — retirer import + usage de `SupplierPartsSearch`, ajouter le nouveau composant de recherche stock inline
- `src/components/quotes/SupplierPartsSearch.tsx` — supprimer le fichier

### Détails techniques
Le nouveau bloc utilisera le hook `useParts()` déjà importé dans la page (via QuoteForm), avec `multiWordSearch` pour le filtrage. Pas de nouveau composant nécessaire — un simple bloc JSX inline avec un `Input` et une liste de résultats filtrés suffira, similaire à ce qui existe déjà dans `QuoteForm.tsx` (lignes 569-618) mais placé en haut de la liste des devis pour consultation rapide.

