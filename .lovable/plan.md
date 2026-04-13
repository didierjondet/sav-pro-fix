

## Plan : Corriger l'onboarding (creation + rejoindre boutique)

### 3 problemes identifies

**1. Triggers sans SECURITY DEFINER**
Les fonctions `add_default_sav_statuses_to_new_shop` et `add_default_sav_types_to_new_shop` ne sont pas en `SECURITY DEFINER`. Quand un nouvel utilisateur cree une boutique, ces triggers tentent d'inserer dans `shop_sav_statuses` / `shop_sav_types`, mais le RLS de ces tables exige `get_current_user_shop_id()` qui retourne NULL (pas encore de profil). L'INSERT de la boutique echoue.

**2. Recursion RLS sur profiles**
La politique `"New users and admins can create profiles"` contient `shop_id IN (SELECT ... FROM profiles ...)` dans son `WITH CHECK`. Quand un nouvel utilisateur cree son premier profil, cette sous-requete declenche les politiques SELECT de `profiles`, qui elles-memes appellent `get_current_user_shop_id()` qui requete `profiles` → recursion infinie.

**3. Politique DENY trop large**
La politique `"DENY: Block access to profiles from other shops"` (cmd=ALL, incluant INSERT) appelle `get_current_user_shop_id()` pendant l'insertion, ce qui aussi cause de la recursion.

### Correction : une seule migration SQL

1. Passer `add_default_sav_statuses_to_new_shop` et `add_default_sav_types_to_new_shop` en `SECURITY DEFINER` pour qu'elles bypassent le RLS

2. Remplacer la politique INSERT `"New users and admins can create profiles"` par une version sans recursion :
   - Un nouvel utilisateur peut creer un profil avec `user_id = auth.uid()` SI il n'a pas encore de profil (verification via la fonction `SECURITY DEFINER` existante `get_current_user_shop_id()` qui retourne NULL)
   - Les admins et super admins restent autorises via les fonctions `SECURITY DEFINER` existantes

3. Aucune modification de `ProfileSetup.tsx` ni d'autre fichier frontend

### Detail technique de la migration

```sql
-- 1. Trigger statuts en SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.add_default_sav_statuses_to_new_shop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ ... (meme corps) $$;

-- 2. Trigger types en SECURITY DEFINER  
CREATE OR REPLACE FUNCTION public.add_default_sav_types_to_new_shop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ ... (meme corps) $$;

-- 3. Remplacer la politique INSERT profiles recursive
DROP POLICY "New users and admins can create profiles" ON profiles;
CREATE POLICY "New users and admins can create profiles" ON profiles
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND get_current_user_shop_id() IS NULL
  OR is_shop_admin()
  OR is_super_admin()
);
```

### Ce qui ne change pas
- Aucun fichier frontend modifie
- Toutes les autres politiques RLS restent identiques
- Le flux d'onboarding (etapes, animations) reste identique
- Les politiques SELECT sur shops ajoutees ce matin restent en place

### Fichier impacte
- **Migration SQL** uniquement (3 modifications)

