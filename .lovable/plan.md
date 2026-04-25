## Plan : nettoyage complet à la suppression d'un magasin + fix création avec email réutilisé

### Problème

1. La suppression actuelle d'un magasin (ShopsManagement.tsx) supprime bien les données métier et les profils liés, **mais ne supprime PAS les comptes auth (`auth.users`)**. Résultat : l'email reste "pris" côté Supabase Auth et impossible de recréer un magasin avec ce même email plus tard.
2. La création de magasin (`create_shop_with_admin`) ne gère pas proprement le cas "email déjà existant" : elle crée d'abord la boutique, échoue ensuite sur la création du user (rollback OK mais frontend reçoit un message générique "Edge Function returned a non-2xx status code").

### Partie 1 — Suppression : nettoyer aussi les comptes auth

**Edge Function `admin-user-management`** : ajouter une nouvelle action `delete_shop_complete` qui, exécutée avec le service_role :

1. Récupère tous les `profiles.user_id` rattachés à ce `shop_id`.
2. Supprime en cascade les données métier liées (sav_parts, sav_status_history, sav_messages, sav_cases, parts, customers, quotes, order_items, notifications, profiles).
3. Pour chaque `user_id` collecté, vérifie qu'il n'a pas de profil dans une autre boutique. Si non, appelle `supabase.auth.admin.deleteUser(user_id)` pour supprimer définitivement le compte auth.
4. Supprime enfin la boutique elle-même.
5. Réservée aux `super_admin`.

**Composant `ShopsManagement.tsx`** : remplacer toute la fonction `deleteShop` par un simple appel à `supabase.functions.invoke('admin-user-management', { body: { action: 'delete_shop_complete', shop_id } })`. Lecture correcte du message d'erreur retourné.

### Partie 2 — Création : ordre + gestion email existant

**Edge Function `admin-user-management` action `create_shop_with_admin`** :

- **Inverser l'ordre** : créer d'abord l'utilisateur auth, puis la boutique, puis le profil. Évite les boutiques fantômes en cas d'échec auth.
- **Pré-vérification** : avant la création auth, intercepter explicitement l'erreur `email_exists` / status 422 et renvoyer un message clair en français : `"Un compte utilise déjà cet email. Choisissez un autre email ou supprimez d'abord la boutique/le compte associé."`
- Conserver les rollbacks pour les étapes ultérieures (échec création boutique → supprimer auth user ; échec création profil → supprimer boutique + auth user).

**Composant `ShopsManagement.tsx`** : lors de l'invocation de l'edge function, lire correctement `data?.error` et le `error.context?.body` pour afficher le vrai message d'erreur dans le toast (au lieu de "Edge Function returned a non-2xx status code").

### Critères d'acceptation

- Suppression d'un magasin → magasin, données métier, profils ET comptes auth associés disparaissent. Possibilité de recréer immédiatement un nouveau magasin avec le même email admin.
- Création avec un email déjà pris → message clair en français, pas de boutique orpheline créée, formulaire reste ouvert.
- Création avec un email libre → magasin + admin créés, l'admin se connecte et est forcé de changer son mot de passe.

### Note

Pour l'email `maisonglun@gmail.com` actuellement bloqué : après déploiement, la suppression de l'ancien magasin (ou la suppression directe du compte via Super Admin → Utilisateurs) libérera l'email. Si aucun magasin ne le possède, je peux ajouter une opération ponctuelle pour supprimer ce compte orphelin.
