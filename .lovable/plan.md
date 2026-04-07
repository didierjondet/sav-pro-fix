
Vous avez raison : en lisant le code, le problème principal n’est pas un simple cache. La vraie cause est surtout une logique “fail-open” + une synchronisation incomplète :

- `useRolePermissions.ts` démarre et retombe sur `ALL_TRUE` (tout autorisé). Si la requête n’est pas encore prête, si elle ne se réexécute pas au bon moment, ou si elle échoue, l’UI reste ouverte.
- Le callback realtime de `shop_role_permissions` est vide, donc quand on modifie les autorisations d’un rôle, les autres sessions ne se mettent pas vraiment à jour.
- La vue simplifiée ne dépend pas réellement du rôle courant : `Header.tsx` ne l’applique que si `fixway_simplified_view` n’existe pas déjà en localStorage. Donc un ancien choix “false” empêche `shop_admin` de passer en vue simplifiée.
- `Index.tsx` redirige vers `/sav` uniquement selon le localStorage, pas selon la permission chargée.
- Le lien “Paramètres” du menu utilisateur dans `Header.tsx` est affiché sans vérifier `menu_settings`, donc même si le rôle ne doit pas voir les réglages, il reste un accès visible.
- La protection est aujourd’hui surtout visuelle dans la sidebar ; elle n’est pas encore suffisamment appliquée au layout et aux routes.

Plan de correction

1. Fiabiliser la source RBAC
- Remplacer le fallback `ALL_TRUE` par un fallback métier par rôle (`admin`, `technician`, `shop_admin`) pour ne plus ouvrir toute l’interface par défaut.
- Faire retourner aussi un vrai `loading` exploitable.
- Ajouter un refetch/invalidate réel quand `shop_role_permissions` change, et aussi quand le `profiles.role` de l’utilisateur courant change.

2. Corriger la vue simplifiée
- Ne plus piloter `shop_admin` avec une simple clé globale `fixway_simplified_view`.
- Stocker la préférence par utilisateur/boutique, ou réinitialiser proprement la valeur quand le rôle change.
- Faire dépendre le démarrage de la vue simplifiée du rôle/permissions réellement chargés, pas seulement du localStorage.

3. Fermer les accès qui restent visibles
- Masquer aussi le lien “Paramètres” dans le dropdown du header si `menu_settings = false`.
- Appliquer la même règle aux écrans sensibles : `/settings`, `/reports`, `/statistics`, `/sav/:id/logs`, et aux zones conditionnelles déjà présentes dans `Settings.tsx`.
- Empêcher qu’une URL directe contourne la sidebar.

4. Supprimer le comportement “tout s’affiche puis rien ne change”
- Utiliser `rolePermissions.loading` dans `Sidebar`, `Header`, `Settings` et `Index`.
- Pendant le chargement, ne pas afficher les éléments protégés, ou afficher un état neutre.
- Ainsi, on n’aura plus un site “ouvert par défaut” qui semble ignorer les rôles.

5. Vérifier la cohérence métier sans casser le reste
- Revoir la fonction SQL `is_shop_admin()` car son nom laisse penser qu’elle couvre aussi `shop_admin`, alors qu’actuellement elle ne retourne vrai que pour `admin`.
- Je ne la modifierai que si cette incohérence impacte réellement les droits métier attendus, pour éviter d’ouvrir trop de droits côté base.

Ce que je corrigerai en priorité pour votre cas “Isa calm”
- Passage en `shop_admin` : disparition du lien Réglages partout.
- Application correcte de la vue simplifiée pour ce rôle.
- Prise en compte immédiate des permissions du rôle configuré (ex. Commandes désactivé si vous l’avez coupé).
- Réaction correcte après changement de rôle ou modification des autorisations, sans dépendre d’un ancien état local.

Fichiers concernés
- `src/hooks/useRolePermissions.ts`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/pages/Index.tsx`
- `src/pages/Settings.tsx`
- probablement `src/pages/Reports.tsx`, `src/pages/Statistics.tsx`, `src/pages/SAVLogs.tsx`
- éventuellement une migration SQL ciblée seulement si l’audit de `is_shop_admin()` confirme un vrai décalage bloquant

Méthode pour éviter les effets de bord
- Je corrige d’abord la logique de chargement et d’application des permissions côté interface.
- Je n’élargis pas les droits SQL tant que ce n’est pas démontré nécessaire.
- Je validerai ensuite le scénario exact : même utilisateur passé successivement en `technician`, `shop_admin`, `admin`, avec vérification de la sidebar, du header, de la vue simplifiée et des accès directs aux pages.
