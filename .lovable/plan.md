# Plan — Refactor `upgrade-subscription` + audit `stripe-webhook`

## (a) Refactor `upgrade-subscription`

**Problème** : la fonction `supabase/functions/upgrade-subscription/index.ts` contient les Stripe price IDs en dur (lignes 80-86). Si un prix change, le code casse silencieusement.

**Action** :
- Supprimer la fonction `getPriceId()`.
- Charger dynamiquement le `stripe_price_id` depuis `subscription_plans` via `tier_key = targetPlan`.
- Renvoyer une erreur 400 explicite si le plan est inconnu ou si `stripe_price_id` est manquant.
- Ajouter logging (style `logStep`) comme dans `create-checkout` pour faciliter le debug.
- Aligner la version Stripe API sur `2025-08-27.basil` (cohérence avec les autres functions récentes — facultatif, à confirmer).
- Garder l'`origin` dynamique (fallback sur Preview URL au lieu de `"https://your-domain.com"`).

## (b) Audit + corrections `stripe-webhook`

Bugs identifiés à la relecture de `supabase/functions/stripe-webhook/index.ts` :

1. **Fallback de tier cassé** (lignes 110-112) : seuils `>= 4000` cents = enterprise, `>= 1200` = premium. Les vrais prix sont 4900 (premium) et 7900 (enterprise) → un Premium serait classé Enterprise. Correction : `>= 7900 → enterprise`, `>= 4900 → premium`. (Cas rare car le lookup par `stripe_price_id` couvre le cas normal, mais à corriger.)

2. **Update `shops` par `subscription.metadata.user_email` ne marche jamais** (lignes 129-133, 156-160) : `create-checkout` met les metadata sur la **Checkout Session**, pas sur la subscription. Donc `subscription.metadata.user_email` est `undefined` et l'`UPDATE` cible une chaîne vide → aucune ligne touchée.
   
   Correction : dans `create-checkout` ajouter `subscription_data: { metadata: { user_id, user_email, plan_id } }` pour que les metadata se propagent à la subscription. Idem dans `upgrade-subscription`. Le webhook continuera à fonctionner.

3. **Signature webhook optionnelle** (lignes 39-47) : si `STRIPE_WEBHOOK_SECRET` n'est pas configuré, le webhook accepte n'importe quel POST non signé. Risque sécurité en prod.
   
   Correction : si pas de `STRIPE_WEBHOOK_SECRET` configuré → renvoyer 500 avec message clair. Plus de fallback "no signature verification".

4. **`subscribers.upsert` sur `stripe_customer_id`** (ligne 126) : à vérifier rapidement qu'une contrainte unique existe sur cette colonne (sinon l'upsert crée des doublons). Si absente → ajouter via migration `ALTER TABLE subscribers ADD CONSTRAINT subscribers_stripe_customer_id_key UNIQUE (stripe_customer_id);`.

5. **SMS package purchases** (lignes 165-196) : `handleCheckoutCompleted` gère les SMS one-time via les metadata `sms_credits`/`shop_id`, mais `purchase-sms-package` enregistre aussi une ligne `pending` dans `sms_package_purchases` qui n'est jamais passée à `completed`. À vérifier rapidement et corriger si nécessaire pour marquer le statut.

## Vérifications à faire avant prod (chat seulement, pas de code)

- Confirmer que `STRIPE_SECRET_KEY` est bien en **mode live** (pas test) — les price IDs `price_1TH3...` existent dans les deux modes potentiellement.
- Confirmer que `STRIPE_WEBHOOK_SECRET` est bien configuré côté secrets, et que l'endpoint webhook est bien déclaré dans le dashboard Stripe pour les events : `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`.

## Fichiers touchés

- `supabase/functions/upgrade-subscription/index.ts` (refactor complet)
- `supabase/functions/create-checkout/index.ts` (ajout `subscription_data.metadata`)
- `supabase/functions/stripe-webhook/index.ts` (corrections 1, 2, 3, 5)
- Migration éventuelle pour la contrainte unique sur `subscribers.stripe_customer_id` (si absente)

Pas de changement UI.
