
## Problème observé

Sur une nouvelle boutique (ex. Sophiatech, plan « Découverte ») :
- Le header affiche **0 SAV restant / 0 SMS restant** à la première connexion.
- Après resynchro, on voit **15 SMS** au lieu des **5** définis dans le plan « Découverte » du Super Admin.
- Le plan Super Admin dit : Découverte = 2 SAV / 5 SMS, mais le code retombe sur des valeurs codées en dur (15 SMS, 5 SAV).

## Cause racine

1. **`ProfileSetup.handleCreateShop`** crée la boutique sans `subscription_plan_id` → la boutique n'est rattachée à aucun plan.
2. **Table `shops`** : `sms_credits_allocated` a une valeur par défaut codée en dur à **15**, et `subscription_tier='free'`. Aucun lien automatique avec la table `subscription_plans`.
3. **`useSubscription.ts`** identifie le plan par `plan.name.toLowerCase()` (« découverte ») au lieu de `tier_key` (`free`). Le `tier` retombe donc en dehors de l'enum, et le code applique ensuite des fallbacks codés en dur (`free → 5 SAV`, `free → 15 SMS`) au lieu de lire `plan.sav_limit` / `plan.sms_limit`.
4. `check-subscription` Stripe peut écraser localement avec des valeurs incohérentes.

➡ Conséquence : la source de vérité **n'est pas** `subscription_plans` (Super Admin), mais des constantes éparpillées.

## Objectif

Faire de la table `subscription_plans` (gérée dans Super Admin) **la seule source de vérité** pour les limites SAV et SMS, dès la création de la boutique.

## Plan d'action

### 1. Migration DB
- Créer une fonction `public.get_default_free_plan()` qui retourne le plan actif dont `tier_key='free'`.
- Trigger `BEFORE INSERT` sur `public.shops` :
  - Si `subscription_plan_id` est NULL → assigner le plan `free`.
  - Synchroniser `sms_credits_allocated` ← `plan.sms_limit`, `subscription_tier` ← `plan.tier_key`.
- Étendre le trigger existant `sync_shop_sms_limits` pour qu'il se déclenche aussi quand `subscription_plan_id` change (et non seulement à l'insert).
- Script de **réparation rétroactive** : pour chaque boutique sans `subscription_plan_id`, assigner le plan free + recalculer `sms_credits_allocated` depuis `plan.sms_limit`. Boutique Sophiatech passera ainsi de 15 → 5 SMS, plan « Découverte » lié.

### 2. `ProfileSetup.tsx` (création boutique)
- À la création : lire le plan « free » (`tier_key='free'`) depuis `subscription_plans` et insérer la boutique avec `subscription_plan_id`, `subscription_tier='free'`, `sms_credits_allocated = plan.sms_limit`. (Le trigger fait redondance mais on garde une cohérence côté client immédiate.)

### 3. `src/hooks/useSubscription.ts`
- Charger le plan via `tier_key` (pas `name`).
- **Supprimer les fallbacks codés en dur** (15 SMS, 5/50/100 SAV).
- Limite SAV = `custom_sav_limit ?? plan.sav_limit`.
- Limite SMS = `custom_sms_limit ?? plan.sms_limit`.
- Si aucun plan trouvé → afficher « — » plutôt qu'une fausse valeur.
- Identique pour `checkLimits` : utiliser les valeurs du plan, plus de switch `tier === 'free' → 5`.

### 4. `useProactiveLimits.ts`
- Mêmes corrections : retirer le bloc `if tier === 'free' savLimit = 5 … premium = 50 …`. S'aligner sur `subscription.custom_sav_limit ?? plan.sav_limit` (passé via le hook).

### 5. Edge function `check-subscription`
- Vérifier qu'elle ne réécrit pas `sms_credits_allocated` avec des constantes : ne mettre à jour que `subscription_tier` / `subscription_plan_id` issus de Stripe, puis laisser le trigger `sync_shop_sms_limits` aligner les crédits depuis `subscription_plans`.

### 6. Vérification
- Recharger Sophiatech : header doit afficher **2 SAV restants / 5 SMS restants**.
- Créer une nouvelle boutique de test → mêmes valeurs immédiatement, sans attendre une resynchro.
- Modifier `sms_limit` du plan Découverte dans Super Admin → la valeur se propage aux boutiques free (via trigger ou recalcul ciblé selon ce qui est déjà en place).

## Points techniques (référence)

- Table `subscription_plans` : `id`, `tier_key` (`free|premium|enterprise|custom`), `sav_limit`, `sms_limit`.
- Table `shops` colonnes touchées : `subscription_plan_id`, `subscription_tier`, `sms_credits_allocated`, `custom_sav_limit`, `custom_sms_limit`.
- Memory existante : « identifier les plans par `tier_key`/`id`, jamais par `name` » → cette règle est appliquée partout dans ce plan.
- Aucun changement de RLS, aucun impact sur les pages publiques (tracking, satisfaction, RDV) ni sur l'envoi de SMS.
