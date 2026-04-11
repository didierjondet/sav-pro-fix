
Plan corrigé : le problème ne vient pas d’un fichier “oublié”, il vient surtout d’une logique backend encore active qui court-circuite totalement l’onboarding.

### Cause réelle identifiée
Aujourd’hui, à l’inscription, la fonction Supabase `public.handle_new_user()` crée automatiquement :
- une nouvelle boutique
- un profil admin lié à cette boutique

Conséquence :
- dans `Index.tsx`, `profile` existe déjà
- `ProfileSetup` n’est jamais affiché
- la popup “Mon Magasin” apparaît directement
- la boutique est déjà visible dans Super Admin

J’ai aussi repéré un 2e blocage : même si on stoppe l’auto-création, `Index.tsx` considère encore `!profile` comme un état de chargement, ce qui empêcherait aussi l’onboarding de s’afficher correctement.

### Ce qu’il faut réellement modifier

**1. Supabase — neutraliser l’auto-création à l’inscription**
- Modifier la fonction `public.handle_new_user()` pour qu’elle ne crée plus automatiquement ni `shops`, ni `profiles` lors du signup.
- On garde l’inscription auth seule ; le choix “Créer une boutique / Rejoindre une boutique” sera ensuite fait dans l’onboarding.
- Résultat attendu :
  - un nouveau compte n’apparaît plus automatiquement comme nouvelle boutique dans Super Admin
  - aucune boutique n’est créée tant que l’utilisateur n’a pas choisi explicitement “Créer ma boutique”

**2. `src/pages/Index.tsx` — afficher réellement l’onboarding quand il n’y a pas encore de profil**
- Corriger la logique `isLoading`.
- Ne plus traiter `user && !profile` comme un chargement infini.
- Laisser la page rendre `ProfileSetup` dès que :
  - l’auth est prête
  - la requête profil est terminée
  - aucun profil n’existe encore

**3. `src/components/auth/ProfileSetup.tsx` — réaligner le parcours avec votre vraie règle métier**
Le composant existe, mais il faut l’adapter au bon scénario métier :

- garder le parcours animé
- conserver le choix :
  - `Créer une boutique`
  - `Rejoindre une boutique`
- ne plus demander le nom du magasin dans l’onboarding de création
- si l’utilisateur choisit **Créer** :
  - créer la boutique avec le nom par défaut `Mon Magasin`
  - créer le profil `admin`
  - afficher l’écran festif
  - puis arriver dans la boutique
  - et laisser ensuite la popup existante demander le nom du magasin, comme vous le souhaitez
- si l’utilisateur choisit **Rejoindre** :
  - demander uniquement le code magasin / code d’invitation
  - rattacher le profil à la boutique existante
  - afficher le message de bienvenue + feu d’artifice
  - puis entrer dans la boutique rejointe

**4. Rafraîchissement après onboarding**
- Après succès, recharger à la fois :
  - le profil
  - la boutique
- sinon il y a un risque d’avoir un profil créé mais un `shop` encore en cache à `null`.

### Fichiers à toucher
- `supabase/migrations/...sql` — mise à jour de `public.handle_new_user()`
- `src/pages/Index.tsx` — correction de la condition de chargement + callback de fin d’onboarding
- `src/components/auth/ProfileSetup.tsx` — ajustement du flux pour ne plus demander le nom du shop avant la popup

### Résultat attendu après correction
Avec un compte neuf :
1. inscription
2. arrivée sur l’onboarding animé
3. choix `Créer` ou `Rejoindre`
4. aucune boutique créée tant que ce choix n’est pas fait
5. si `Créer` :
   - boutique créée seulement à ce moment-là
   - arrivée dans la boutique
   - popup de nommage conservée
6. si `Rejoindre` :
   - aucune nouvelle boutique créée
   - rattachement à la boutique existante uniquement

### Vérification à faire ensuite
Tester avec un nouveau compte vierge :
- avant le choix, vérifier dans Super Admin qu’aucune boutique n’a été créée
- choisir `Créer` et vérifier que la popup “nom du magasin” apparaît bien après l’écran festif
- refaire un test avec `Rejoindre` et vérifier qu’aucune boutique supplémentaire n’apparaît dans Super Admin
