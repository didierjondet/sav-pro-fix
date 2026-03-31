

## Plan : Mode "Prise en main" — Impersonation de boutique pour le Super Admin

### Principe

Ajouter un mécanisme d'impersonation purement frontend. Le super admin clique sur "Se connecter" sur une carte magasin et bascule dans le contexte de cette boutique. Toutes les pages (SAV, pièces, clients, stats...) affichent alors les données de cette boutique. Un bandeau visible en haut permet de quitter ce mode.

Aucune modification de base de données nécessaire : les politiques RLS `is_super_admin()` autorisent déjà l'accès à toutes les tables.

### Comment ça marche

Le ShopContext vérifie si un `impersonatedShopId` est stocké (dans un state + localStorage pour persister au refresh). Si oui et que l'utilisateur est super_admin, il charge ce shop au lieu de celui du profil. Toutes les requêtes frontend utilisent déjà `shop.id` depuis le contexte, donc tout bascule automatiquement.

### Fichiers modifiés

**1. `src/contexts/ShopContext.tsx`**
- Ajouter `impersonatedShopId` au state (initialisé depuis localStorage)
- Ajouter `impersonateShop(shopId)` et `stopImpersonation()` au contexte
- Dans la queryFn : si `impersonatedShopId` est défini et user est super_admin, charger ce shop au lieu du shop du profil
- Exporter les nouvelles fonctions dans le type du contexte

**2. `src/components/admin/dashboard/ShopsManagement.tsx`**
- Ajouter un bouton "Se connecter" (icône LogIn, déjà importée) sur chaque carte magasin
- Au clic : appeler `impersonateShop(shop.id)` puis naviguer vers `/dashboard`

**3. `src/components/layout/Header.tsx`** (ou composant dédié)
- Afficher un bandeau d'alerte en haut quand l'impersonation est active : "Vous consultez la boutique [nom] — Quitter"
- Le bouton "Quitter" appelle `stopImpersonation()` et redirige vers `/super-admin`

**4. `src/hooks/useProfile.ts`**
- Vérifier que le profil super_admin ne bloque pas l'affichage quand on est en mode impersonation (le rôle reste super_admin, seul le shop change)

### Sécurité

- L'impersonation est contrôlée côté frontend uniquement pour le super_admin
- Côté base de données, le RLS `is_super_admin()` donne déjà accès total — aucune élévation de privilège
- Le `localStorage` stocke juste un `shopId` temporaire, pas de token sensible
- Si un utilisateur non-super_admin tente de mettre un shopId en localStorage, les politiques RLS bloqueront toutes les requêtes

### Résultat attendu

- Bouton "Se connecter" sur chaque carte magasin dans le super admin
- Clic → redirection vers le dashboard de cette boutique avec toutes ses données
- Bandeau visible permanent rappelant le mode impersonation
- Bouton pour revenir au super admin à tout moment

