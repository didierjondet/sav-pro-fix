# Assainissement des collections Stripe (abonnements + SMS)

## Constat de l'audit (déjà vérifié)

- Le compte Stripe connecté à l'application est « Hapics » (`acct_1NO54VLuQ9FfK7YC`) : c'est celui qui porte le gros catalogue (modules MYCOM, Panel réseau, Crédits Authentification…), en mode réel. C'est donc a priori le bon compte — le solde n'est pas lisible via l'API avec la clé actuelle, à confirmer visuellement dans votre tableau de bord Stripe.
- Premium 49 €/mois et Enterprise 79 €/mois : actifs, mode réel, identifiants conformes entre l'application et ce compte. OK.
- Packs SMS : créés « à la volée » au paiement, sans produit Stripe enregistré — suivi comptable peu lisible.
- Doublons dans les packs SMS actifs visibles par les clients :
  - « Pack 100 SMS » : 8 €/100 SMS **et** 10 €/70 SMS
  - « Pack 250 SMS » : 18 €/250 SMS **et** 40 €/250 SMS
  - « Pack 500 SMS » : 28 €/500 SMS **et** 35 €/500 SMS

## Actions proposées

1. **Garantir le compte unique** : tous les achats (abonnements + SMS) passent déjà par la même clé secrète `STRIPE_SECRET_KEY`, donc par ce seul compte. Vérifier qu'aucune autre clé n'est configurée (secrets du projet) et documenter que ce compte Hapics est le compte officiel.
2. **Nettoyer les doublons SMS** : désactiver les versions les moins avantageuses (10 €/70, 40 €/250, 35 €/500) pour ne garder qu'un pack par palier. L'historique des achats passés est conservé.
3. **Créer de vrais produits Stripe pour les packs SMS** : un produit + un prix par pack actif (50, 100, 250, 500, 1000 SMS) sur ce même compte, enregistrés dans `sms_packages.stripe_price_id`. La fonction `purchase-sms-package` utilisera ces prix au lieu de les créer à la volée — chaque vente devient identifiable dans le tableau de bord Stripe.
4. **Vérification finale** : relire la correspondance application ↔ Stripe et confirmer que les 2 abonnements + 5 packs sont tous actifs sur le même compte.

## Détails techniques

- `sms_packages` : ajout colonne `stripe_price_id` (migration), désactivation via `is_active = false` (jamais de suppression).
- `supabase/functions/purchase-sms-package/index.ts` : remplacer `price_data` inline par `price: packageData.stripe_price_id` ; repli sur `price_data` si absent.
- Aucune modification des abonnements (déjà conformes).

## À confirmer avant exécution

- Quels packs garder par palier (proposition : les moins chers) ?
- Confirmez visuellement dans Stripe que le compte au gros catalogue est bien celui au solde positif.
