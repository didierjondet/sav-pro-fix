

## Plan : Corriger la recherche client dans la popup de modification SAV

### Problème
`EditSAVCustomerDialog.tsx` utilise `useCustomers()` (ligne 45) qui est **paginé** (10 éléments par page par défaut). La recherche ne fonctionne donc que sur les 10 premiers clients. Il faut utiliser `useAllCustomers()` qui charge tous les clients de la boutique.

### Modification

**Fichier : `src/components/sav/EditSAVCustomerDialog.tsx`**

1. Remplacer l'import `useCustomers` par `useAllCustomers`
2. Remplacer `const { customers, createCustomer } = useCustomers()` par `const { customers } = useAllCustomers()` + import séparé de `useCustomers` uniquement pour `createCustomer`

Concrètement :
- Import : `useAllCustomers` au lieu de `useCustomers` pour la liste
- Garder `useCustomers` uniquement pour la fonction `createCustomer`

### Fichier impacté
- `src/components/sav/EditSAVCustomerDialog.tsx`

