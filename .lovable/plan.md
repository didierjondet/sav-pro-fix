

## Plan : Statistiques magasins enrichies dans le Super Admin

### Changements demandes

1. **Supprimer le lien URL du magasin** sur les cards dans ShopsManagement
2. **Ajouter un filtre de tri** (plus recent / plus ancien) sur la liste des magasins
3. **Ajouter le nombre de connexions** par magasin sur les cards
4. **Ajouter la date de derniere connexion** de chaque utilisateur dans l'onglet Utilisateurs de ShopManagementDialog

### Approche technique

**Donnees de connexion** : Les informations de connexion (`last_sign_in_at`) sont dans la table `auth.users` de Supabase, inaccessible directement depuis le client. On va etendre l'edge function `admin-user-management` avec une nouvelle action `list_users_with_auth` qui utilise le service role key pour recuperer ces donnees via `supabase.auth.admin.listUsers()`.

### Fichiers modifies

**1. `src/components/admin/dashboard/ShopsManagement.tsx`**
- Supprimer le bloc URL du magasin (lignes 479-507)
- Ajouter un state `sortOrder` (`'newest' | 'oldest'`) et un bouton/select de tri
- Trier `filteredShops` par `created_at` selon l'ordre choisi
- Ajouter un badge "X connexions" sur chaque card (donnee recuperee depuis le parent)

**2. `src/pages/SuperAdmin.tsx`**
- Dans `fetchData`, ajouter une requete pour compter les connexions par magasin depuis les auth logs (via la nouvelle action de l'edge function) et injecter `total_logins` dans chaque shop

**3. `supabase/functions/admin-user-management/index.ts`**
- Ajouter une action `get_shop_auth_stats` qui :
  - Recupere tous les utilisateurs via `supabase.auth.admin.listUsers()`
  - Pour chaque shop_id demande, retourne le nombre total de connexions et la derniere connexion par user_id
  - Utilise `last_sign_in_at` de chaque user

**4. `src/components/admin/ShopManagementDialog.tsx`**
- Dans `fetchUsers`, appeler l'edge function avec l'action `get_shop_auth_stats` pour recuperer `last_sign_in_at` par user
- Afficher la date de derniere connexion sous chaque utilisateur dans l'onglet Utilisateurs
- Format : "Derniere connexion : il y a X jours" ou "Jamais connecte"

### Interface visuelle

Cards magasins :
- Badge existants (utilisateurs, dossiers SAV, stockage) + nouveau badge "X connexions"
- Bouton de tri "Plus recent / Plus ancien" a cote de la recherche
- Plus de bloc URL

Onglet Utilisateurs (dialog gestion) :
- Sous le nom/role de chaque user : ligne "Derniere connexion : DD/MM/YYYY a HH:MM" en texte muted

