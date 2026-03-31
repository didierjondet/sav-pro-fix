

## Plan : Ajouter la localisation de derniere connexion (simplifie)

### Approche

Pas de nouvelle table. Juste 2 colonnes sur `profiles` : `last_login_city` et `last_login_country`. Mises a jour a chaque login via un appel simple a `https://ipapi.co/json/`.

### Fichiers modifies

**Migration SQL** :
- `ALTER TABLE profiles ADD COLUMN last_login_city text`
- `ALTER TABLE profiles ADD COLUMN last_login_country text`

**`src/contexts/AuthContext.tsx`** :
- Apres un `signIn` reussi, appeler `https://ipapi.co/json/` (gratuit, sans cle API, 1000 req/jour)
- Mettre a jour `profiles` avec `last_login_city` et `last_login_country`
- Pas de blocage : si l'appel echoue, on ignore silencieusement

**`src/components/admin/ShopManagementDialog.tsx`** :
- Dans l'onglet Utilisateurs, afficher sous la date de derniere connexion : icone MapPin + "Paris, France" (ou "Localisation inconnue")
- Les colonnes sont deja dans le SELECT des profiles, pas de requete supplementaire

### Volume de code

- ~10 lignes SQL
- ~15 lignes dans AuthContext (fetch geo + update profile)
- ~5 lignes dans ShopManagementDialog (affichage)

