
Plan : basculer sur une boutique tout en restant connecté en super admin

1. Diagnostic confirmé
- Le système actuel essaie de changer de session via un magic link, donc il peut retomber sur `/auth`.
- Si on garde seulement un faux changement de `ShopContext`, cela ne suffit pas non plus, car une grande partie de l’app utilise directement `profile.shop_id` et `profile.role`.
- Donc la bonne solution n’est ni un mot de passe universel, ni un vrai logout/login automatique : il faut un mode de “prise en main” interne, mais appliqué au profil effectif de toute l’application.

2. Approche à mettre en place
- Garder la vraie session authentifiée du super admin.
- Ajouter un état global de bascule, par exemple `impersonated_shop_id`.
- Quand cet état est actif, l’application doit se comporter comme si le super admin était un admin normal de la boutique choisie :
  - `shop_id` effectif = boutique sélectionnée
  - `role` effectif = admin ou shop_admin
- Le profil réel du super admin reste conservé en parallèle pour pouvoir quitter ce mode et revenir au panneau super admin.

3. Fichiers à adapter
- `src/components/admin/dashboard/ShopsManagement.tsx`
  - Remplacer l’appel Edge Function par une bascule locale :
    - stocker la boutique ciblée
    - rediriger vers `/dashboard`
- `src/hooks/useProfile.ts`
  - Faire retourner un profil “effectif” quand un super admin est en mode boutique
  - Ajouter aussi `actualProfile` / `isImpersonating` pour les cas où il faut connaître le vrai rôle
- `src/contexts/ShopContext.tsx`
  - Charger la boutique active selon :
    - boutique du profil normal
    - ou boutique impersonnée si super admin en mode support
- `src/pages/Index.tsx`
  - Ne plus rediriger vers `/super-admin` si le super admin est en mode boutique
- `src/components/layout/Header.tsx` ou `Sidebar.tsx`
  - Ajouter un bouton discret mais permanent : “Quitter la boutique”
  - Masquer les éléments super admin pendant la prise en main
- `supabase/functions/super-admin-login-as-shop/index.ts`
  - Le rendre obsolète ou le retirer de ce flux pour éviter toute confusion

4. Pourquoi cette approche va marcher
- Aujourd’hui, beaucoup de hooks filtrent les données avec `profile.shop_id`.
- Si `useProfile()` fournit un profil effectif de la boutique choisie, ces hooks pointeront automatiquement vers le bon magasin.
- Résultat : SAV, devis, commandes, clients, agenda, notifications, etc. fonctionneront comme pour un compte boutique normal, sans demander d’identifiant supplémentaire.

5. Points à vérifier pendant la correction
- Redirection automatique des super admins vers `/super-admin`
- Menus visibles pendant la prise en main
- Création d’un SAV ou d’un devis avec le bon `shop_id`
- Pages qui utilisent encore le vrai rôle au lieu du rôle effectif
- Retour propre au panneau super admin sans perdre la session

6. Résultat attendu
```text
Super admin connecté
-> clic sur "Se connecter" d’une boutique
-> activation du mode boutique
-> redirection vers /dashboard
-> toute l’application utilise la boutique choisie
-> comportement identique à un utilisateur normal du magasin
-> bouton "Quitter la boutique" pour revenir au super admin
```

Détail technique
- Ce n’est pas une vraie connexion au compte du magasin.
- C’est une “vue forcée globale” correctement propagée à tout le frontend.
- C’est la seule manière cohérente de rester connecté en super admin tout en utilisant le magasin comme un utilisateur classique.
- Elle évite les problèmes de login, de magic link, et d’écran `/auth`.
