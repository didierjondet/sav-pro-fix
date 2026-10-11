# Assainissement des collections Stripe (abonnements + SMS)

## Constat de l'audit (déjà vérifié)

- Compte unique « Hapics » : abonnements et packs SMS passent par le même compte. OK.
- Premium 49 €/mois et Enterprise 79 €/mois : actifs, mode réel, identifiants conformes entre l'application et Stripe. OK.
- Packs SMS : créés « à la volée » au paiement, sans produit Stripe enregistré — suivi comptable peu lisible.
- Doublons dans les packs SMS actifs visibles par les clients :
  - « Pack 100 SMS » : 8 €/100 SMS **et** 10 €/70 SMS
  - « Pack 250 SMS » : 18 €/250 SMS **et** 40 €/250 SMS
  - « Pack 500 SMS » : 28 €/500 SMS **et** 35 €/500 SMS

## Actions proposées

1. **Nettoyer les doublons SMS** : désactiver les versions les plus chères/moins avantageuses (10 €/70, 40 €/250, 35 €/500) pour ne garder qu'un pack par palier. Les achats passés restent conservés dans l'historique.
2. **Créer de vrais produits Stripe pour les packs SMS** : un produit + un prix par pack actif (50, 100, 250, 500, 1000 SMS), enregistrés dans `sms_packages.stripe_price_id`. La fonction `purchase-sms-package` utilisera ces prix au lieu de les créer à la volée — chaque vente devient identifiable dans le tableau de bord Stripe.
3. **Vérification finale** : relire la correspondance application ↔ Stripe après modification et confirmer que les 2 abonnements + 5 packs sont tous actifs sur le même compte.

## Détails techniques

- `sms_packages` : ajout colonne `stripe_price_id` (migration), désactivation via `is_active = false` (jamais de suppression, historique préservé).
- `supabase/functions/purchase-sms-package/index.ts` : remplacer `price_data` inline par `price: packageData.stripe_price_id` ; repli sur `price_data` si absent.
- Aucune modification des abonnements (déjà conformes).

## À confirmer avant exécution

- Quels packs garder par palier (proposition : les moins chers) ?
