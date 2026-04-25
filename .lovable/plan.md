
## Plan : création magasin + mot de passe initial + reset password fonctionnel

### Partie 1 — Création de magasin avec compte admin et mot de passe (Super Admin)

**Objectif :** quand le super admin crée un magasin, il saisit aussi l'email et le mot de passe initial du compte administrateur du magasin. Le compte est créé immédiatement (email auto-confirmé), associé au nouveau magasin avec le rôle `admin`, et marqué comme devant changer son mot de passe à la première connexion.

**Modifications :**

1. **Base de données** (migration) :
   - Ajouter une colonne `must_change_password` (boolean, défaut `false`) à la table `profiles`.

2. **Edge Function `admin-user-management`** :
   - Ajouter une nouvelle action `create_shop_with_admin` qui, en une opération :
     - Crée la boutique (`shops` insert avec name/email/phone/address).
     - Crée l'utilisateur auth (`auth.admin.createUser` avec `email_confirm: true` et le mot de passe fourni).
     - Crée le profil `admin` lié à la boutique avec `must_change_password = true` et `first_name`/`last_name` saisis.
     - En cas d'échec d'une étape, rollback des étapes précédentes.
   - Sécurité : action réservée aux `super_admin`.

3. **Composant `ShopsManagement.tsx`** :
   - Étendre le formulaire de création avec les champs : prénom admin, nom admin, email admin (séparé de l'email du magasin), mot de passe (min. 6 caractères), confirmation mot de passe.
   - Remplacer l'appel direct `supabase.from('shops').insert(...)` par l'appel à l'Edge Function `create_shop_with_admin`.
   - Validation côté client (mots de passe identiques, longueur, email valide).

### Partie 2 — Forcer le changement de mot de passe à la 1re connexion

**Composant `ForcePasswordChangeDialog.tsx` (nouveau)** :
- Modal non-fermable affichant un formulaire (nouveau mot de passe + confirmation).
- À la soumission : appelle `supabase.auth.updateUser({ password })` puis met à jour `profiles.must_change_password = false`.

**Intégration dans `Index.tsx` (et autres pages d'entrée si besoin)** :
- Lire `profile.must_change_password` (déjà chargé via `useProfile`).
- Si `true`, afficher le `ForcePasswordChangeDialog` par-dessus le contenu, bloquant l'accès tant que le changement n'est pas effectué.
- Hook `useProfile` déjà en place — ajouter le champ dans la query si nécessaire.

### Partie 3 — Correction du flux "Mot de passe oublié"

**Problème actuel :** `resetPasswordForEmail` redirige vers `/auth`, mais cette page ne détecte pas le token `type=recovery` dans l'URL et ne propose pas de formulaire de nouveau mot de passe → l'utilisateur revient à l'écran de connexion.

**Solution :**

1. **Nouvelle page `/reset-password`** (`src/pages/ResetPassword.tsx`) :
   - Route publique ajoutée dans `App.tsx`.
   - Au montage : Supabase a déjà créé une session temporaire à partir du lien (event `PASSWORD_RECOVERY` dans `onAuthStateChange`).
   - Affiche un formulaire (nouveau mot de passe + confirmation).
   - À la soumission : `supabase.auth.updateUser({ password })`, toast de succès, redirection vers `/auth` (ou `/dashboard` si la session reste valide).
   - Gestion de l'erreur "lien expiré / invalide" avec un bouton pour redemander un email.

2. **Mise à jour de `Auth.tsx` — `handleResetPassword`** :
   - Changer `redirectTo` de `https://sav-pro-fix.lovable.app/auth` vers `https://sav-pro-fix.lovable.app/reset-password`.

3. **Important — Configuration Supabase à vérifier par le user après déploiement :**
   - Dans Supabase Dashboard → Authentication → URL Configuration, l'URL `https://sav-pro-fix.lovable.app/reset-password` (ainsi que `https://fixway.fr/reset-password` et `https://logicielsav.com/reset-password`) doit être ajoutée à la liste des Redirect URLs autorisées. Sinon Supabase ignorera le `redirectTo` et utilisera le Site URL par défaut.

### Détails techniques

- **Migration SQL :** `ALTER TABLE profiles ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;`
- **Pas de modification RLS nécessaire** : les utilisateurs lisent/modifient déjà leur propre profil.
- **Rollback Edge Function** : si la création du profil échoue après la création du user auth, on appelle `auth.admin.deleteUser` puis on supprime la boutique. Si la création de l'auth user échoue après la boutique, on supprime la boutique.
- **Page `/reset-password`** : utilise `onAuthStateChange` pour intercepter `PASSWORD_RECOVERY` et permettre la mise à jour même sans session "complète".

### Critères d'acceptation

- Super Admin → "Créer un magasin" : formulaire élargi avec champs admin (prénom, nom, email, mot de passe, confirmation). Validation. Création OK → la boutique apparaît + l'admin peut se connecter immédiatement.
- L'admin se connecte pour la 1re fois → un dialogue bloquant force le changement de mot de passe avant d'accéder à l'app. Après changement, accès normal et le dialogue ne réapparaît plus.
- Sur `/auth`, "Mot de passe oublié" → email reçu → clic sur le lien → arrivée sur `/reset-password` avec formulaire de nouveau mot de passe → soumission → connexion possible avec le nouveau mot de passe.
