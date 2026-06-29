
## Diagnostic du bug "Données Stripe indisponibles"

J'ai trouvé la cause exacte. Dans l'edge function `stripe-admin-metrics`, le contrôle "super_admin" est cassé :

```ts
.from("profiles").select("role").eq("id", userData.user.id)
```

Dans la table `profiles`, la colonne qui contient l'ID de l'utilisateur Auth s'appelle **`user_id`**, pas `id` (`id` est l'identifiant interne de la ligne profil). Résultat : la requête ne trouve jamais le profil → la fonction renvoie **403 Forbidden** → le frontend affiche "Edge Function returned a non-2xx status code".

C'est un bug uniquement dans cette fonction, le reste du chemin Stripe (clé, webhook, plans) est OK.

---

## Plan en 2 parties

### 1. Correctif immédiat (débloque l'affichage Stripe)
- `supabase/functions/stripe-admin-metrics/index.ts` : remplacer `.eq("id", userData.user.id)` par `.eq("user_id", userData.user.id)`.
- Ajouter un fallback de diagnostic : si l'appel Stripe échoue (clé invalide, réseau, etc.), renvoyer un JSON 200 avec `{ error_kind, error_message, last_synced_at }` au lieu d'un 500 muet, pour que le frontend puisse afficher un message clair plutôt qu'un "non-2xx".
- `src/components/admin/DashboardOverview.tsx` : afficher le détail d'erreur renvoyé (au lieu du message générique) + bouton "Réessayer".

### 2. Nouveau menu Super Admin : "Système & Stripe"
Nouvelle entrée dans `SuperAdminSidebar.tsx` (groupe Configuration, icône `Plug`/`CreditCard`) qui ouvre un panneau `StripeSystemPanel.tsx` avec :

**Bloc Connexion Stripe**
- État de la clé `STRIPE_SECRET_KEY` (présente / mode test ou live / dernier appel OK ou KO)
- Bouton "Tester la connexion" (appelle une nouvelle edge function `stripe-health-check` qui fait un `stripe.accounts.retrieve()` et renvoie nom du compte + mode)
- Affichage du dernier message d'erreur Stripe rencontré

**Bloc Synchronisation**
- Date de dernière synchro réussie (metrics)
- Bouton "Resynchroniser maintenant" (relance `stripe-admin-metrics` + `check-subscription` pour toutes les boutiques abonnées)

**Bloc Cohérence Plans ↔ Stripe**
- Liste des `subscription_plans` actifs avec leur `stripe_price_id`
- Pour chacun : vérification que le prix existe réellement côté Stripe (via `stripe-health-check`), montant, intervalle
- Drapeau rouge si un plan a un `stripe_price_id` invalide ou manquant

**Bloc Webhook**
- URL du webhook à configurer côté Stripe (rappel)
- État du secret `STRIPE_WEBHOOK_SECRET` (configuré / manquant)
- 10 derniers événements webhook reçus (lecture depuis les logs de `stripe-webhook` si on ajoute une petite table `stripe_webhook_events`, ou simplement lien direct vers les logs Supabase)

**Bloc Abonnements actifs**
- Compteur live (réutilise `stripe-admin-metrics`)
- Lien "Ouvrir dans le Dashboard Stripe"

### Edge functions
- Nouvelle : `stripe-health-check` (super_admin only) → renvoie `{ account, mode, prices_status[] }`
- Modifiée : `stripe-admin-metrics` (correctif + erreurs structurées)

### Sécurité
- Les deux fonctions vérifient le rôle `super_admin` via `user_id` (pas `id`)
- Aucune nouvelle table sensible ; aucune clé exposée au front

---

## Ce que ça donne pour toi
Une fois en place, dès qu'un problème Stripe survient (clé expirée, plan mal configuré, webhook KO) tu auras un écran dédié qui te dit exactement ce qui ne va pas et un bouton pour retester, au lieu d'un message rouge opaque.
