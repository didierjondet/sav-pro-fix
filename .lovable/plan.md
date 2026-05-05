## Action ciblée

Supprimer uniquement les données liées à `maisonglun@gmail.com` afin qu'il puisse recréer un compte/magasin :

- **Auth user** : `bf4d25bc-64f5-492b-a007-a58c8bad28cf`
- **Boutique** : `Easycash Montelimar` (`f3df8523-53bd-41fa-8930-7dc48b543b08`) — déjà vide (0 SAV, 0 client, 0 devis)
- **Profil** : seul rattachement à cette boutique

### Étapes (migration SQL ponctuelle)
1. Nettoyer les éventuelles tables filles attachées à ce shop (notifications, order_items, sav_messages, sav_parts, sav_status_history, sav_cases, customers, quotes, parts, profiles) — par sécurité, même si vide.
2. Supprimer la ligne dans `shops`.
3. Supprimer l'utilisateur `bf4d25bc-64f5-492b-a007-a58c8bad28cf` dans `auth.users`.

### Hors scope
Les 15 auth users orphelins ne seront **pas** touchés.

### Résultat attendu
`maisonglun@gmail.com` libéré et capable de recréer un compte normalement.
