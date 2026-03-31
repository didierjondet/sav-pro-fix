
## Plan : corriger "Se connecter" pour ouvrir la vraie boutique en utilisateur normal

### Diagnostic confirmé

Le comportement actuel est logique par rapport au code en place, mais ce n’est pas ce que vous voulez :

- le bouton de `ShopsManagement.tsx` appelle seulement `impersonateShop(shop.id)`
- cela change `ShopContext`, mais ne change pas l’utilisateur connecté
- le profil reste `super_admin`
- sur `/dashboard`, `src/pages/Index.tsx` détecte `profile?.role === 'super_admin'` et renvoie vers `/super-admin`

Donc aujourd’hui ce n’est pas une vraie connexion à la boutique, juste une vue forcée dans le contexte admin.

### Ce qu’il faut faire

Remplacer ce faux mode d’impersonation par une vraie prise de session sur la boutique cible, côté site publié FixwayPro.

### Implémentation proposée

#### 1. Créer un Edge Function de connexion sécurisée "super admin -> boutique"
Créer une fonction Supabase dédiée qui :

- vérifie le JWT appelant
- vérifie que l’utilisateur connecté est bien `super_admin`
- reçoit `shop_id`
- cherche un utilisateur admin normal de cette boutique
- génère un lien de connexion temporaire / session de connexion pour cet utilisateur
- retourne l’URL de redirection vers le site publié `https://sav-pro-fix.lovable.app/dashboard`

But :
- ouvrir une vraie session boutique
- ne plus rester connecté comme super admin dans l’interface super admin

#### 2. Définir clairement quel utilisateur boutique utiliser
Comme vous voulez “comme si j’étais un utilisateur lambda du magasin”, il faut une règle simple et stable :

priorité recommandée :
- admin de la boutique
- sinon `shop_admin`
- sinon premier utilisateur disponible de la boutique

Si la boutique n’a aucun utilisateur exploitable :
- afficher une erreur claire dans le super admin
- éventuellement proposer ensuite un fallback, mais pas dans cette première correction

#### 3. Modifier `src/components/admin/dashboard/ShopsManagement.tsx`
Changer le bouton "Se connecter" pour :

- ne plus appeler `impersonateShop`
- appeler la nouvelle Edge Function
- récupérer l’URL de connexion
- rediriger avec `window.location.href` vers cette URL

Résultat attendu :
- en cliquant, vous quittez vraiment l’espace super admin
- vous arrivez sur FixwayPro avec une session boutique normale

#### 4. Désactiver l’ancien faux mode d’impersonation
Le code actuel de `ShopContext.tsx` et le bandeau du `Header.tsx` ne correspondent plus au besoin.

Je prévois donc de :
- retirer l’usage du bouton actuel basé sur `impersonateShop`
- supprimer ou neutraliser le bandeau “Mode prise en main”
- conserver éventuellement le code de contexte seulement si vous voulez garder un mode support interne séparé, sinon le nettoyer

#### 5. Vérifier les redirections qui bloquent aujourd’hui
Le point bloquant principal est ici :

- `src/pages/Index.tsx` redirige les `super_admin` vers `/super-admin`

Après correction, ce ne sera plus un problème si la nouvelle session est bien celle d’un vrai compte boutique, car `useProfile()` remontera alors un rôle normal (`admin` ou `shop_admin`) et non `super_admin`.

### Fichiers concernés

- `src/components/admin/dashboard/ShopsManagement.tsx`
- `src/contexts/ShopContext.tsx`
- `src/components/layout/Header.tsx`
- `src/pages/Index.tsx` (vérification)
- nouveau fichier Edge Function, par exemple :
  - `supabase/functions/super-admin-login-as-shop/index.ts`

### Sécurité

La bonne approche est obligatoirement côté backend / edge function, pas seulement frontend.

Pourquoi :
- il faut vérifier côté serveur que l’appelant est bien super admin
- il faut générer une connexion temporaire sécurisée
- il ne faut jamais exposer un “pass universel” côté client
- il ne faut pas stocker de mot de passe admin de boutique côté front

### Résultat attendu après correction

Quand vous cliquez sur "Se connecter" depuis une card magasin :

- vous quittez réellement l’interface super admin
- vous êtes redirigé vers le site FixwayPro publié
- vous arrivez comme un vrai utilisateur de la boutique choisie
- vous voyez ses SAV, pouvez en créer, utiliser les menus normaux, comme un compte classique
- vous ne restez plus sur `/super-admin`

### Détail technique

```text
Aujourd’hui
Super admin -> bouton "Se connecter" -> ShopContext forcé -> /dashboard -> profil toujours super_admin -> retour /super-admin

Après correction
Super admin -> Edge Function sécurisée -> génération d’un login temporaire pour un vrai user de la boutique -> redirection FixwayPro -> session boutique normale -> /dashboard boutique
```

### Point important

Cette correction ne doit pas réutiliser l’ancien système d’impersonation frontend pour ce bouton, car c’est précisément la cause du problème actuel.
