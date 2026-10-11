# Collections Stripe : Super Admin d'abord, réplication Stripe ensuite

## Principe directeur (règle métier)

Les packs SMS et les abonnements sont **toujours gérés d'abord dans le Super Admin** (base de données), puis **répliqués en temps réel sur Stripe**. Jamais l'inverse. Stripe devient un miroir de la configuration Super Admin, sur le compte unique « Hapics » au gros catalogue (`acct_1NO54VLuQ9FfK7YC`).

## Constat de l'audit (déjà vérifié)

- Compte connecté : « Hapics », celui au gros catalogue (MYCOM, Panel réseau, Crédits Authentification…), mode réel. Tous les achats passent par la même clé `STRIPE_SECRET_KEY`, donc ce seul compte. Le solde n'est pas lisible via l'API — à confirmer visuellement dans votre tableau de bord Stripe.
- Premium 49 €/mois et Enterprise 79 €/mois : actifs et conformes entre l'application et Stripe.
- Packs SMS : créés « à la volée » au paiement, sans produit Stripe enregistré.
- Doublons actifs visibles par les clients : « Pack 100 SMS » (8 €/100 et 10 €/70), « Pack 250 SMS » (18 €/250 et 40 €/250), « Pack 500 SMS » (28 € et 35 €).

## Actions

1. **Nettoyer les doublons SMS** dans le Super Admin : désactiver 10 €/70, 40 €/250, 35 €/500 (historique conservé).
2. **Réplication Super Admin → Stripe pour les abonnements** : à la création/modification d'un plan dans `SubscriptionPlansManager`, une fonction crée ou met à jour le produit + prix Stripe correspondant et enregistre `stripe_price_id` sur le plan. Les prix existants (Premium, Enterprise) sont rattachés tels quels.
3. **Réplication Super Admin → Stripe pour les packs SMS** : ajout de `sms_packages.stripe_price_id` ; à la création/modification d'un pack, création du produit + prix Stripe et enregistrement de l'identifiant.
4. **Paiement SMS aligné** : `purchase-sms-package` utilise le `stripe_price_id` enregistré au lieu de créer le prix à la volée — chaque vente devient identifiable dans Stripe.
5. **Vérification finale** : correspondance complète Super Admin ↔ Stripe (2 abonnements + 5 packs) sur le même compte.

## Détails techniques

- Migration : `ALTER TABLE sms_packages ADD COLUMN stripe_price_id text` (nullable, sans suppression).
- Nouvelle fonction edge `sync-stripe-product` (appelée par le Super Admin uniquement, rôle vérifié côté serveur) : crée/met à jour produit + prix Stripe, renvoie et stocke `stripe_price_id`. Stripe ne permet pas de modifier le montant d'un prix existant : un changement de tarif crée un nouveau prix et archive l'ancien.
- `purchase-sms-package/index.ts` : `price: packageData.stripe_price_id`, repli sur `price_data` si absent.
- `SubscriptionPlansManager.tsx` et le gestionnaire de packs SMS : appel de la réplication après chaque enregistrement, avec message d'erreur visible si Stripe échoue (la base reste la référence).
- Aucune modification des flux de paiement existants (checkout abonnement inchangé).

## À confirmer

- Quels packs garder par palier (proposition : les moins chers) ?
- Confirmez visuellement dans Stripe que le compte au gros catalogue est bien celui au solde positif.
