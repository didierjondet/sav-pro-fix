
## Plan : faire fonctionner l’inscription et la connexion Google directement sur FixwayPro

### Diagnostic confirmé

Le problème vient du fait que l’auth Google part actuellement avec `window.location.origin`, donc depuis la preview Lovable cela renvoie vers l’URL preview au lieu du vrai site publié `https://sav-pro-fix.lovable.app`.

Les logs confirment :
- des callbacks Google lancés depuis la preview
- un `access_denied` sur `/callback`
- puis parfois un signup/login Google qui aboutit côté Supabase, mais pas avec la bonne expérience utilisateur

Il y a aussi un problème secondaire dans le code récent :
- `ShopNamePromptDialog.tsx` utilise `Dialog` avec `open/onOpenChange`
- si le composant `Dialog` importé n’accepte pas correctement ce pattern dans ce contexte, cela peut expliquer le build cassé à vérifier/fixer en même temps

### Changements à faire

#### 1. Centraliser l’URL publique du site
Créer une constante simple côté front pour le domaine publié FixwayPro, par exemple :
- `https://sav-pro-fix.lovable.app`

Elle servira pour tous les flux d’auth sensibles :
- Google OAuth
- email de confirmation
- renvoi d’email de confirmation
- reset password

Objectif :
- ne plus dépendre de `window.location.origin` pour l’auth
- toujours renvoyer l’utilisateur vers le vrai site FixwayPro

#### 2. Corriger `src/pages/Auth.tsx`
Remplacer les URLs dynamiques actuelles par l’URL publique FixwayPro :
- `resetPasswordForEmail(... redirectTo: "https://sav-pro-fix.lovable.app/auth")`
- `supabase.auth.resend(... emailRedirectTo: "https://sav-pro-fix.lovable.app/auth")`
- `signInWithOAuth({ provider: 'google', options: { redirectTo: "https://sav-pro-fix.lovable.app/dashboard" } })`

Résultat attendu :
- connexion Google depuis l’écran Auth redirigée vers le vrai site
- inscription Google idem
- plus de retour sur lovable preview pour ce flux

#### 3. Corriger `src/contexts/AuthContext.tsx`
Le `signUp` email/password utilise aussi `window.location.origin`.
Il faut le remplacer par l’URL publique FixwayPro :
- `emailRedirectTo: "https://sav-pro-fix.lovable.app/"` ou `/auth` selon le flux voulu

Je garderai une logique cohérente avec l’écran existant :
- confirmation email vers le site FixwayPro
- puis retour sur une page gérée par l’app

#### 4. Vérifier/fixer le build cassé lié aux derniers changements
Relire le composant :
- `src/components/dialogs/ShopNamePromptDialog.tsx`

Point probable à sécuriser :
- s’assurer qu’il respecte bien les imports/types attendus
- si besoin, rendre le dialog non fermable par fermeture externe ou ajuster la structure pour éviter l’erreur de build

Comme l’erreur précise n’est pas fournie, je prévois de corriger le point le plus suspect sans alourdir la logique.

### Vérifications externes indispensables

Même avec le bon code, Google OAuth ne fonctionnera correctement que si la configuration externe est cohérente.

#### Supabase Dashboard
Dans Authentication > URL Configuration :
- Site URL : `https://sav-pro-fix.lovable.app`
- Redirect URLs : inclure au minimum le domaine publié FixwayPro

#### Google Cloud Console
Dans l’OAuth client web :
- Authorized JavaScript origins : `https://sav-pro-fix.lovable.app`
- Authorized redirect URI : utiliser exactement l’URL callback affichée dans Supabase pour Google provider

Important :
- il ne faut pas compter sur la preview Lovable pour valider Google OAuth
- le test final doit se faire sur le site publié FixwayPro

### Fichiers concernés

- `src/pages/Auth.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/dialogs/ShopNamePromptDialog.tsx` si nécessaire pour corriger le build

### Résultat attendu

Après correction :
- “Continuer avec Google” ouvre et termine le flux sur le vrai site FixwayPro
- l’inscription Google et la connexion Google arrivent bien sur `/dashboard` du site publié
- les emails de confirmation/réinitialisation renvoient aussi vers FixwayPro
- le build repasse correctement

### Détail technique

```text
Aujourd’hui
Preview Lovable -> Google OAuth -> callback Supabase -> retour preview / comportement instable

Après correction
Auth Fixway/FixwayPro -> Google OAuth -> callback Supabase -> retour https://sav-pro-fix.lovable.app/dashboard
```
