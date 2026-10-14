# Roadmap

- [x] Impression SAV : magasin seul sans client, bandeaux client/magasin distincts, reformulation de panne ultra-concise ; tests et exemples imprimés vérifiés, IA déployée (parcours connecté non vérifiable sur ce projet).

- [x] Remplacer les anciennes adresses officielles de contact Fixway par fixwaypro@gmail.com sur le site et les formulaires, sans changer les comptes de connexion.

- [ ] Parcours devis : temps réel (publication quotes), statut/pastille acceptés, impression à la transformation en SAV (plan approuvé, en cours)
- [ ] Règle de suppression des magasins inactifs : régler la valeur 90 jours en base (requête annulée précédemment ; UI + fonction déjà écrites)
- [x] Stripe : nettoyer doublons packs SMS (désactiver 10€/70, 40€/250, 35€/500)
- [x] Stripe : colonne sms_packages.stripe_price_id + création produits/prix Stripe pour les 5 packs
- [x] Stripe : fonction sync-stripe-product (Super Admin → Stripe, temps réel)
- [x] Stripe : purchase-sms-package utilise stripe_price_id
- [x] Stripe : appel de la réplication depuis SubscriptionPlansManager et gestionnaire packs SMS

- [x] Saisie d'un SAV depuis le smartphone (QR, formulaire mobile, lecture IA des codes, impression sur ordinateur)
