# Vérification abonnements Stripe — Rapport

J'ai croisé 3 sources : la table `subscription_plans` (admin), la page Landing/Subscription (frontend) et les prix réels dans Stripe.

## Résultats

| Plan | Prix BDD (admin) | Prix Stripe | Stripe Price ID | Statut |
|------|------------------|-------------|-----------------|--------|
| Découverte (free) | 0 € | — | — | OK (gratuit) |
| Premium | 49,00 €/mois | **49,00 € EUR** | `price_1TH34QLuQ9FfK7YC9F5qeEIe` | ✅ Cohérent |
| Enterprise | 79,00 €/mois | **79,00 € EUR** | `price_1TH34RLuQ9FfK7YCqYbZfTQ4` | ✅ Cohérent |
| Sur Devis (custom) | 0 € | — | — | `is_active=false`, `contact_only=true` — OK |

## Cohérence code ↔ BDD ↔ Stripe

- `PricingSection.tsx` (landing) et `Subscription.tsx` lisent dynamiquement `subscription_plans` → affichent automatiquement 49 € / 79 €. ✅
- `create-checkout/index.ts` utilise `planData.stripe_price_id` depuis la BDD → toujours synchro. ✅
- `upgrade-subscription/index.ts` contient les price IDs **en dur** :
  - `premium: price_1TH34QLuQ9FfK7YC9F5qeEIe`
  - `enterprise: price_1TH34RLuQ9FfK7YCqYbZfTQ4`
  
  Ils correspondent bien aux IDs en BDD et aux prix Stripe (49 € / 79 €). ✅

## Points d'attention (non bloquants)

1. **Price IDs en dur dans `upgrade-subscription`** — Si tu modifies un prix côté Stripe/BDD un jour, il faudra aussi mettre à jour cette edge function. Recommandation : la faire lire depuis `subscription_plans` comme `create-checkout`. (Pas urgent, juste une dette technique.)
2. **Mode Stripe** — les price IDs commencent par `price_1TH3...` : à confirmer que ta clé `STRIPE_SECRET_KEY` est bien en **mode live** (et non test) avant mise en production.
3. **Webhook Stripe** (`stripe-webhook`) — non vérifié dans ce passage. Si tu veux, je peux contrôler que la signature webhook est bien configurée et que les events (`checkout.session.completed`, `customer.subscription.updated/deleted`) mettent à jour `subscribers` correctement.

## Conclusion

**Les prix affichés sur le site, dans l'admin et dans Stripe sont identiques (49 € Premium / 79 € Enterprise).** Tu peux passer en production côté tarification.

## Prochaine étape proposée (à valider)

Souhaites-tu que je :
- (a) refactore `upgrade-subscription` pour lire les price IDs depuis la BDD (supprime la dette technique), et/ou
- (b) vérifie le webhook Stripe + le flux complet d'activation d'abonnement,
- (c) ou rien — tu valides juste ce rapport ?
