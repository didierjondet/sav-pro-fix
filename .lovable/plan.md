

## Plan : Corriger les politiques RLS pour debloquer l'onboarding

### Causes racines confirmees par les screenshots

1. **Creer une boutique** → erreur "new row violates row-level security policy for table shops"
   - L'INSERT sur `shops` a une politique qui autorise les nouveaux utilisateurs sans profil : OK
   - MAIS le `.select().single()` apres l'INSERT necessite un SELECT, et la seule politique SELECT exige `id = get_current_user_shop_id()` qui retourne NULL pour un utilisateur sans profil
   - Supabase refuse donc le RETURNING et renvoie une erreur RLS

2. **Rejoindre une boutique** → erreur "Code d'invitation invalide"
   - La requete `supabase.from('shops').select('id, name').ilike('invite_code', ...)` est bloquee par RLS
   - Meme raison : le SELECT sur shops exige `id = get_current_user_shop_id()`, impossible pour un nouvel utilisateur

### Correction : migration SQL

Ajouter deux nouvelles politiques SELECT sur la table `shops` :

1. **Permettre la recherche par code d'invitation** pour les utilisateurs authentifies sans profil :
```sql
CREATE POLICY "Authenticated users can find shops by invite code"
ON public.shops FOR SELECT TO authenticated
USING (
  NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid())
  AND invite_code IS NOT NULL
);
```
Cela permet a un nouvel utilisateur de chercher une boutique par son code d'invitation, mais UNIQUEMENT s'il n'a pas encore de profil (donc pendant l'onboarding seulement).

2. **Permettre de lire la boutique qu'on vient de creer** (pour le RETURNING du INSERT) :
```sql
CREATE POLICY "New users can read their just-created shop"
ON public.shops FOR SELECT TO authenticated
USING (
  NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid())
  AND created_at > now() - interval '10 seconds'
);
```
Alternative plus simple : modifier `handleCreateShop` dans `ProfileSetup.tsx` pour ne pas utiliser `.select().single()` apres l'INSERT, et plutot faire l'INSERT du profil sans avoir besoin du shop ID retourne. Mais cela compliquerait le code.

### Modification dans ProfileSetup.tsx

- Normaliser le code d'invitation : `formData.inviteCode.trim().toUpperCase()` avant la requete
- Ajouter un `await supabase.auth.getSession()` avant les operations pour s'assurer que la session est active
- Meilleure gestion d'erreur avec messages specifiques

### Fichiers impactes
- **Migration SQL** : 2 nouvelles politiques SELECT sur `shops`
- **`src/components/auth/ProfileSetup.tsx`** : normalisation du code + verification de session

### Ce qui ne change pas
- Les politiques existantes restent en place
- Le flux d'onboarding (etapes, animations) reste identique
- La logique de creation de profil reste la meme

