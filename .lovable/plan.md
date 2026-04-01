

## Plan : Mapper les Price IDs Stripe avec les plans du site

### Contexte
La cle secrete Stripe est deja configuree. Les produits et prix existent dans le nouveau compte Stripe. Il faut maintenant mettre a jour :
1. La table `subscription_plans` en base avec les nouveaux `stripe_price_id`
2. Les edge functions qui referencent des Price IDs en dur
3. La table `sms_packages` si elle existe, pour les packs SMS

### Etape 1 — Mettre a jour les plans en base (via insert tool / UPDATE)
```sql
UPDATE subscription_plans SET stripe_price_id = 'price_1TH34QLuQ9FfK7YC9F5qeEIe' WHERE LOWER(name) = 'premium';
UPDATE subscription_plans SET stripe_price_id = 'price_1TH34RLuQ9FfK7YCqYbZfTQ4' WHERE LOWER(name) = 'enterprise';
```

### Etape 2 — Mettre a jour les packs SMS en base
Verifier la table `sms_packages` et mettre a jour les `stripe_price_id` pour les 3 packs (50, 100, 500 SMS).

### Etape 3 — Mettre a jour les edge functions

**`supabase/functions/upgrade-subscription/index.ts`** :
- Remplacer les placeholders `price_premium_id` / `price_enterprise_id` dans `getPriceId()` par les vrais Price IDs
- Ou mieux : lire le `stripe_price_id` depuis la table `subscription_plans` (comme le fait deja `create-checkout`)

**`supabase/functions/check-subscription/index.ts`** :
- Le fallback de detection par montant utilise 3900 et 5900. Mettre a jour vers 4900 (Premium) et 7900 (Enterprise)

**`supabase/functions/create-checkout/index.ts`** :
- Deja dynamique (lit `stripe_price_id` depuis la base). Rien a changer si la base est a jour.

**`supabase/functions/purchase-sms-package/index.ts`** :
- Verifier s'il utilise des Price IDs en dur pour les packs SMS et mettre a jour

### Etape 4 — Verifier le webhook secret
Demander a l'utilisateur s'il a un `STRIPE_WEBHOOK_SECRET` pour le nouveau compte (si le webhook Stripe est utilise).

### Fichiers impactes
- `supabase/functions/upgrade-subscription/index.ts` — correction `getPriceId()`
- `supabase/functions/check-subscription/index.ts` — correction fallback montants
- `supabase/functions/purchase-sms-package/index.ts` — verification Price IDs SMS
- Base de donnees : tables `subscription_plans` et `sms_packages`

