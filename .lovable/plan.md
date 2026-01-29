
# Plan de correction : Invitation d'utilisateurs

## Problème identifié

L'erreur "function extensions.http_post(unknown, text, unknown, jsonb) does not exist" se produit car la fonction PostgreSQL `create_real_user_for_shop` essaie d'utiliser l'extension `http` de PostgreSQL pour faire des appels HTTP vers l'API Admin de Supabase.

Cette extension n'est pas activée dans votre projet Supabase, et ce n'est pas la meilleure approche de toute facon.

## Solution

Utiliser l'edge function `admin-user-management` qui existe deja dans le projet. Cette fonction utilise correctement le `SUPABASE_SERVICE_ROLE_KEY` cote serveur pour creer des utilisateurs via l'API Admin de Supabase.

## Fichier a modifier

**`src/pages/Settings.tsx`** - Modifier la logique d'invitation pour appeler l'edge function au lieu de la fonction RPC

### Changements dans Settings.tsx

1. Remplacer l'appel `supabase.rpc('create_real_user_for_shop', ...)` par `supabase.functions.invoke('admin-user-management', ...)`

2. Adapter les parametres pour correspondre a l'interface de l'edge function :
   - `action: 'create'`
   - `email: inviteEmail`
   - `password: motdepasse123` (mot de passe temporaire)
   - `first_name`, `last_name`, `phone`
   - `role: inviteRole`
   - `shop_id: shop.id`

### Code actuel (ligne 1372-1402)
```typescript
const { data, error } = await supabase.rpc('create_real_user_for_shop', {
  p_email: inviteEmail,
  p_password: 'motdepasse123',
  p_first_name: '',
  p_last_name: '',
  p_phone: '',
  p_role: inviteRole,
  p_shop_id: shop.id
});
```

### Nouveau code
```typescript
const { data, error } = await supabase.functions.invoke('admin-user-management', {
  body: {
    action: 'create',
    email: inviteEmail,
    password: 'FixwayTemp2024!',
    first_name: '',
    last_name: '',
    phone: '',
    role: inviteRole,
    shop_id: shop.id
  }
});
if (error) throw error;
if (data?.error) throw new Error(data.error);
```

## Note importante

L'edge function `admin-user-management` requiert que l'utilisateur appelant soit **super_admin**. Si l'utilisateur actuel est un admin de boutique (shop_admin ou admin), il faudra soit :
1. Modifier l'edge function pour permettre aux admins de boutique de creer des utilisateurs dans leur propre boutique
2. Ou creer une nouvelle edge function dediee aux invitations de boutique

Je vais verifier et adapter l'edge function si necessaire pour permettre aux admins de boutique d'inviter des utilisateurs.

## Ameliorations supplementaires

1. Ajouter des champs pour le prenom, nom et telephone dans le dialog d'invitation
2. Utiliser un mot de passe plus securise genere aleatoirement
3. Afficher un message demandant a l'utilisateur invite de changer son mot de passe a la premiere connexion
