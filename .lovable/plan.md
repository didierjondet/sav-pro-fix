

## Plan : Nom de magasin obligatoire + popup de rappel

### Contexte

Le trigger `handle_new_user` cree un magasin avec le nom "Mon Magasin" par defaut. Beaucoup d'admins ne changent jamais ce nom, ce qui rend la gestion dans le super admin difficile.

### Changements

**1. `src/pages/Index.tsx`** — Popup de rappel :
- Detecter si `shop.name` vaut "Mon Magasin" (le defaut) ET si le profil est `admin`
- Afficher un Dialog avec un champ Input pour saisir le nom du magasin
- Bouton "Enregistrer" qui fait un `supabase.from('shops').update({ name })` puis rafraichit le shop
- Message explicatif : "Veuillez donner un nom a votre magasin pour mieux l'identifier. Vous pourrez le modifier plus tard dans les parametres."
- Le dialog se montre a chaque connexion tant que le nom reste "Mon Magasin"

**2. `src/components/auth/ProfileSetup.tsx`** — Nom obligatoire a la creation :
- Le champ "Nom du magasin" existe deja et est marque obligatoire
- Ajouter un texte d'aide sous le champ : "Ce nom identifie votre magasin. Vous pourrez le modifier plus tard."
- Pas de changement majeur, juste renforcer le message

**3. Nouveau composant `src/components/dialogs/ShopNamePromptDialog.tsx`** :
- Dialog avec titre "Donnez un nom a votre magasin"
- Input pour le nom
- Validation : minimum 2 caracteres, pas "Mon Magasin"
- Bouton enregistrer qui update le shop et ferme le dialog
- Peut etre ferme temporairement mais reapparait au prochain chargement

### Fichiers modifies

- `src/components/dialogs/ShopNamePromptDialog.tsx` (nouveau)
- `src/pages/Index.tsx` (ajout du dialog)
- `src/components/auth/ProfileSetup.tsx` (texte d'aide)

