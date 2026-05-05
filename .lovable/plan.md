## Objectif

Rendre le code d'invitation (`invite_code`) visible directement sur chaque card magasin de la page `/super-admin`, avec un bouton pour le copier en un clic.

## Changement

Fichier : `src/components/admin/dashboard/ShopsManagement.tsx`

Dans la grille d'infos de chaque card (ligne ~567, à côté de Email / Téléphone / CA), ajouter une nouvelle ligne dédiée affichant :

- Libellé : **Code d'invitation**
- Le code affiché en monospace, fond légèrement coloré (badge style)
- Une petite icône **Copy** cliquable qui copie le code dans le presse-papier et affiche un toast "Code copié"

Affichage uniquement si `shop.invite_code` existe (sinon affiche "—").

## Détails techniques

- Réutiliser `navigator.clipboard.writeText(shop.invite_code)` + `useToast()` (déjà importé)
- Importer l'icône `Copy` depuis `lucide-react`
- Le champ `invite_code` est déjà présent dans l'interface `Shop` et déjà chargé par la requête côté Super Admin — aucune modification SQL ni hook à faire

## Hors périmètre

- Pas de modification de l'edge function `admin-user-management`
- Pas de changement RLS / DB
- Pas de modification du dialog "Gérer" (où le code est déjà visible)
