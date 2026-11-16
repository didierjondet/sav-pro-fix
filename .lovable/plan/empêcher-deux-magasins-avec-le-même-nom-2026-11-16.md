# Empêcher deux magasins avec le même nom

## Constat
- Aujourd'hui aucun contrôle : rien n'empêche deux magasins d'avoir le même nom.
- En base, le seul nom en double est « Mon magasin » (6 magasins) : c'est le nom provisoire donné automatiquement à l'inscription, avant que l'utilisateur saisisse le vrai nom.

## Ce qui change
1. **Contrôle en direct** dans la fenêtre « Nom du magasin » (et l'écran de création du profil) : dès la saisie, message « Ce nom est déjà utilisé par un autre magasin, ajoutez par exemple la ville » et bouton Valider bloqué.
2. **Protection côté serveur** : même si deux personnes valident en même temps, le second enregistrement est refusé avec le même message clair.
3. **Comparaison souple** : majuscules, accents et espaces ignorés (« Easycash Agde » = « easycash  agde »).
4. **Nom provisoire « Mon magasin »** : exclu de la règle, pour ne pas bloquer les inscriptions en cours ; l'utilisateur doit de toute façon le remplacer par un nom unique.
5. Le Super Admin reçoit le même message s'il renomme un magasin avec un nom déjà pris.

## Détails techniques
- Migration : fonction `normalize_shop_name` (unaccent + lower + espaces compressés), index unique partiel sur `normalize_shop_name(name)` où le nom normalisé ≠ 'mon magasin'.
- RPC `is_shop_name_available(_name, _exclude_shop_id)` SECURITY DEFINER (renvoie seulement vrai/faux, aucun nom exposé), utilisée avec un délai de frappe dans `ShopNamePromptDialog.tsx`, `ProfileSetup.tsx`, `ShopManagementDialog.tsx`.
- Erreur Postgres 23505 traduite en message français.
- Règle testable dans `src/lib/shopName.ts` + test bun (normalisation, exclusion du nom provisoire).
