

## Plan : Configurer le Webhook Secret Stripe

### Action unique
Ajouter le secret `STRIPE_WEBHOOK_SECRET` avec la valeur `whsec_ExOpbQyvJ4pWSifLaSrMVVll2PHFAhqK` dans les secrets du projet Supabase, accessible par les Edge Functions.

Le fichier `supabase/functions/stripe-webhook/index.ts` utilise deja `Deno.env.get("STRIPE_WEBHOOK_SECRET")` pour verifier la signature des webhooks — aucune modification de code necessaire.

### Fichier impacte
Aucun — uniquement ajout d'un secret runtime.

