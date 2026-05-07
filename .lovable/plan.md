## Cause racine

Plusieurs endroits du code identifient un plan d'abonnement par son **nom affichable** (`plan.name.toLowerCase()`) au lieu d'utiliser sa **clé technique stable** (`tier_key` ou `id`). Quand tu renommes un plan dans Super Admin (ex: "Free" → "Découverte"), le matching casse silencieusement :

- `ShopManagementDialog` ne retrouve plus le plan → onglet **Abonnement** vide, onglet **Forcer l'accès** avec tous les switches OFF (le cas que tu observes pour "hiphone repair" et tous les magasins free).
- `Settings.tsx` / `Subscription.tsx` : le badge "Plan actuel" et la logique de checkout s'égarent si le nom diffère du `subscription_tier` stocké.
- `check-subscription` (edge) : écrit `subscription_tier = matchingPlan.name.toLowerCase()` → écrase le tier en base avec un libellé renommé (ex: "découverte"), désynchronisant tout le reste qui attend "free".
- `create-checkout` (edge) : cherche le plan par nom envoyé depuis le front.

Tant qu'on s'appuie sur le nom, **chaque renommage cassera à nouveau** la même mécanique.

## Principe directeur du correctif

Source de vérité unique : la colonne **`tier_key`** de `subscription_plans` (déjà existante : `free`, `premium`, `enterprise`). Le `name` devient purement cosmétique (libellé affiché). Tout matching, stockage et appel API se base sur `tier_key` ou `subscription_plan_id`.

Règle : **interdire toute comparaison par `name`** sur les plans.

## Modifications

### 1. Front — résolution du plan d'un magasin (helper centralisé)

Créer `src/lib/planResolver.ts` exportant :
- `resolvePlan(shop, plans)` → retourne le plan via, dans l'ordre :
  1. `plan.id === shop.subscription_plan_id`
  2. `plan.tier_key === shop.subscription_tier`
  3. fallback : plan dont `tier_key === 'free'`
- `getPlanByTierKey(plans, tierKey)`

Remplacer toutes les occurrences listées plus bas par ces helpers.

### 2. `src/components/admin/ShopManagementDialog.tsx`

- Lignes 122-124, 129-131, 381 : utiliser `resolvePlan` / `getPlanByTierKey`.
- Dropdown "Changer d'abonnement" (ligne 863) : `<SelectItem value={plan.tier_key}>` au lieu de `plan.name.toLowerCase()`.
- État initial `newSubscriptionTier` : utiliser `shop.subscription_tier` (déjà OK), mais `handleUpdateSubscription` doit écrire **les deux** champs : `subscription_tier = plan.tier_key` ET `subscription_plan_id = plan.id`.
- `useEffect` de chargement : ajouter `subscriptionPlans` aux dépendances pour que `syncWithDefaultPlan` se déclenche après chargement des plans, et **backfill** automatiquement `subscription_plan_id` si NULL en se basant sur `tier_key`.

### 3. `src/pages/Settings.tsx` (lignes 1892, 1896, 1940) et `src/pages/Subscription.tsx` (ligne 62)

- Détection du plan courant : `plan.tier_key === subscription?.subscription_tier`.
- Bouton checkout : passer `plan.tier_key` (typage `'premium' | 'enterprise'` reste valide puisque tier_key respecte cet enum).

### 4. Edge function `supabase/functions/check-subscription/index.ts`

Ligne 93 : `subscriptionTier = matchingPlan.tier_key` au lieu de `matchingPlan.name.toLowerCase()`. Cela évite d'écrire un libellé renommé dans `shops.subscription_tier`.

### 5. Edge function `supabase/functions/create-checkout/index.ts`

Ligne 133 : `plans?.find(p => p.tier_key === plan)` (le paramètre `plan` envoyé devient le `tier_key`).

### 6. Edge function `supabase/functions/stripe-webhook/index.ts`

Vérifier (lignes 114-148) que `subscriptionTier` est dérivé du `tier_key` du plan matché par `stripe_price_id`, pas de son nom. Ajuster si nécessaire.

### 7. Garde-fou — `SubscriptionPlansManager.tsx`

Quand un super admin modifie un plan :
- Rendre le champ `tier_key` **non éditable** dans l'UI (lecture seule, avec mention "clé technique stable, ne pas modifier").
- Le champ `name` reste librement éditable (libellé d'affichage).
- Garantit qu'un futur renommage n'a aucun impact fonctionnel.

### 8. Migration de réconciliation (one-shot)

Pour réparer les magasins existants où `subscription_plan_id` est NULL (cas hiphone repair) :

```sql
UPDATE shops s
SET subscription_plan_id = sp.id
FROM subscription_plans sp
WHERE s.subscription_plan_id IS NULL
  AND sp.tier_key = COALESCE(s.subscription_tier, 'free')
  AND sp.is_active = true;
```

Et normaliser les `subscription_tier` qui auraient pu être écrits avec des libellés renommés (ex: "découverte") en les ramenant vers leur `tier_key` via `subscription_plan_id` :

```sql
UPDATE shops s
SET subscription_tier = sp.tier_key
FROM subscription_plans sp
WHERE s.subscription_plan_id = sp.id
  AND s.subscription_tier <> sp.tier_key;
```

### 9. Documentation interne

Ajouter en tête de `src/lib/planResolver.ts` un commentaire :
> Toujours identifier un plan par `id` ou `tier_key`. Le `name` est un libellé éditable par le super admin et ne doit jamais servir de clé.

Et créer une mémoire projet `mem://billing/plan-identification-rule` formalisant cette règle.

## Vérification après implémentation

1. Renommer "Découverte" en "Test123" dans Super Admin → tout doit continuer à fonctionner pour les magasins free.
2. Ouvrir "hiphone repair" → onglet Abonnement affiche le plan, onglet Forcer l'accès montre les bons badges "Inclus / Non inclus".
3. Changer le plan d'un magasin via le dropdown : `subscription_tier` ET `subscription_plan_id` mis à jour de manière cohérente.
4. Page `/settings` côté boutique : badge "Plan actuel" correct même après renommage.
5. Checkout Stripe : déclenchable sur le bon `tier_key`.