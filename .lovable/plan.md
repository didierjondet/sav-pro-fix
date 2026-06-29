## Objectif
Recréer une entrée de menu dédiée « Stripe » dans le Super Admin, totalement isolée des autres SaaS qui partagent le même compte Stripe. Toutes les métriques affichées doivent provenir uniquement des produits/prix Fixway déclarés dans `subscription_plans`.

## Principe d'isolation (point critique)
Le compte Stripe héberge plusieurs SaaS. Aujourd'hui `stripe-admin-metrics` liste **toutes** les souscriptions actives du compte → fuite de données d'autres business. On restreint à un allowlist Fixway :

- Source de vérité : `subscription_plans.stripe_price_id` (+ `stripe_product_id` si présent).
- On construit un `Set<priceId>` Fixway et un `Set<productId>` Fixway au démarrage.
- Toute souscription / item / facture / charge dont le `price.id` (ou `product.id`) n'est pas dans ces sets est **ignorée** (ni comptée dans le MRR, ni listée, ni cumulée dans le CA).
- Aucun appel "global" type `stripe.balance`, `stripe.charges.list` sans filtre, ni statistiques compte-niveau.

## 1. Edge function `stripe-admin-metrics` (refonte)
Garder la garde super_admin existante, puis :

1. Charger `subscription_plans` (id, name, tier_key, stripe_price_id, monthly_price, billing_interval).
2. Construire `fixwayPriceIds = Set(stripe_price_id)`. Si vide → renvoyer un payload neutre avec `configured: false` et un message « Aucun price Stripe Fixway configuré ».
3. Paginer `stripe.subscriptions.list({ status: 'active' | 'trialing', expand: ['data.items.data.price.product'] })` puis **filtrer chaque item** : ne garder que ceux dont `item.price.id ∈ fixwayPriceIds`. Une souscription mixte n'est comptée que pour ses items Fixway.
4. Calculer sur ce sous-ensemble uniquement :
   - `mrr` (mensualisation des annuels /12)
   - `monthly_revenue`, `annual_revenue`
   - `subscriber_count` = nb de souscriptions ayant ≥ 1 item Fixway
   - `plan_breakdown` groupé par `price_id` Fixway (nom = `subscription_plans.name`, jamais le nom produit Stripe global)
5. CA encaissé : `stripe.invoices.list({ status: 'paid', created: { gte: <30j> } })` puis filtrer ligne par ligne `line.price.id ∈ fixwayPriceIds` ; sommer ces lignes uniquement. Idem pour fenêtre 12 mois si besoin.
6. Réponse : `{ configured, mrr, monthly_revenue, annual_revenue, subscriber_count, plan_breakdown, revenue_30d, revenue_12m, last_synced_at }`.

Aucune autre API Stripe n'est appelée (pas de balance, pas de customers globaux, pas de payouts).

## 2. Nouvelle page Super Admin « Stripe »

Créer `src/components/admin/StripeOverview.tsx` :
- Bandeau d'avertissement : « Données filtrées sur les produits Fixway uniquement ».
- Cartes : MRR, CA mensuel récurrent, CA annuel récurrent, Nb d'abonnés actifs.
- Tableau « Répartition par plan Fixway » : plan, prix, intervalle, nb abonnés, CA.
- Cartes « CA encaissé 30j » et « CA encaissé 12 mois » (issus des invoices filtrées).
- Bouton « Rafraîchir » qui réinvoque la fonction.
- État `configured: false` → message explicite avec lien vers la section « Plans d'abonnement ».

## 3. Sidebar + routage
- `src/components/admin/SuperAdminSidebar.tsx` : ajouter dans le groupe « Analyse » (ou « Fonctionnalités ») une entrée `{ id: 'stripe', title: 'Stripe', icon: CreditCard }`.
- `src/pages/SuperAdmin.tsx` : ajouter `case 'stripe': return <StripeOverview />;`.

## 4. Nettoyage `DashboardOverview`
Le `DashboardOverview` actuel contient encore l'appel à `stripe-admin-metrics` non filtré (potentiellement source de la fuite vue par l'utilisateur). On déplace toute la section Stripe **hors** du Dashboard vers la nouvelle page :
- Retirer de `DashboardOverview.tsx` l'état `metrics`, l'appel à `stripe-admin-metrics`, et les blocs « CA Abonnements (Stripe) », « Répartition des Abonnements Stripe », « Chiffre d'Affaires encaissé (Stripe) ».
- Le Dashboard redevient basé uniquement sur les données locales Fixway (shops, plans).

## 5. Vérifications
- Tester l'edge function (super_admin) avec un compte ayant 0 plan configuré → réponse neutre, pas d'erreur.
- Tester avec les price IDs Fixway → chiffres cohérents avec la liste des plans.
- Vérifier qu'aucun montant d'un autre SaaS n'apparaît (croiser avec `subscription_plans`).

## Hors scope
- Pas de modification des plans, du webhook, ou de `check-subscription`.
- Pas de changement UI ailleurs que la sidebar + la nouvelle page + nettoyage du Dashboard.
