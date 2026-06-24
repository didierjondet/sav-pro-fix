## Objectif

Remplacer les métriques "CA Abonnements" / "Répartition des Plans" / "Détails du CA" du tableau de bord Super Admin par des chiffres réellement encaissés via Stripe (et non les données internes de l'app, qui peuvent inclure des boutiques privilégiées sans facturation).

## Périmètre

Seul le composant `src/components/admin/dashboard/DashboardOverview.tsx` et une nouvelle Edge Function Stripe sont concernés. Aucun changement sur les autres pages, ni sur la logique d'attribution des plans aux boutiques.

## Nouvelle Edge Function : `stripe-admin-metrics`

Rôle : interroger Stripe avec `STRIPE_SECRET_KEY` (déjà disponible) et retourner les métriques consolidées.

Vérifications de sécurité :
- Exige `Authorization: Bearer <jwt>`
- Vérifie que l'appelant a `role = 'super_admin'` dans `profiles` (sinon 403)

Données retournées (JSON) :
- `mrr` : somme des montants mensualisés (€) de toutes les `subscriptions` Stripe `status in ('active','trialing')` (les annuels sont divisés par 12 pour la part mensuelle équivalente — affiché séparément).
- `monthly_revenue` : somme des subscriptions facturées au mois (`recurring.interval = month`).
- `annual_revenue` : somme des subscriptions facturées à l'année (`recurring.interval = year`).
- `subscriber_count` : nombre total d'abonnements actifs.
- `plan_breakdown` : tableau `{ price_id, product_id, plan_name, monthly_price, interval, count, revenue }` agrégé par `price.id`.
  - `plan_name` = nom du `subscription_plans` local matché par `stripe_price_id`, sinon nom du Stripe Product.
- `last_synced_at` : timestamp.

Implémentation :
- `stripe.subscriptions.list({ status: 'active', limit: 100, expand: ['data.items.data.price.product'] })` + pagination via `starting_after` jusqu'à épuisement.
- Inclure aussi `status: 'trialing'` via second appel.
- Pour chaque subscription, parcourir `items.data` et agréger par `price.id`.
- Lookup table `subscription_plans` (`id, name, stripe_price_id, monthly_price, billing_interval`) pour résoudre les noms et compléter le mapping local.

## Modifications front

`DashboardOverview.tsx` :
- Remplacer le `fetchSubscriptionPlans` actuel par un `supabase.functions.invoke('stripe-admin-metrics')`.
- Carte "CA Abonnements" → `monthly_revenue + annual_revenue/12` (MRR consolidé Stripe), libellé inchangé "/ mois".
- Carte "Répartition des Plans d'Abonnement" → boucle sur `plan_breakdown` (nom Stripe/local, prix, nombre réel d'abonnés payants, %).
  - Le pourcentage est calculé sur `subscriber_count` total (et non `shops.length`), pour refléter la part payante réelle.
- Carte "Détails du CA" :
  - "CA Abonnements (mensuel)" = `monthly_revenue` €
  - "CA Abonnements (annuel)" = `annual_revenue` € (avec mention "annualisé")
  - "CA Réseau (total généré)" : conservé tel quel (donnée interne, hors Stripe).
- État de chargement et fallback en cas d'erreur (toast + valeurs à 0 + bandeau « Données Stripe indisponibles »).

## Détails techniques

- L'Edge Function est déclarée dans `supabase/config.toml` avec `verify_jwt = true`.
- Pas de cache côté DB : appel direct Stripe à chaque rafraîchissement de la page Super Admin (volume faible).
- Devise : on suppose EUR (cohérent avec les plans actuels 49€/79€). Les montants Stripe sont divisés par 100.
- Aucune migration SQL, aucun secret à ajouter.

## Fichiers touchés

- `supabase/functions/stripe-admin-metrics/index.ts` (nouveau)
- `supabase/config.toml` (déclaration de la fonction)
- `src/components/admin/dashboard/DashboardOverview.tsx` (réécriture du fetch + rendu des 3 cartes concernées)
