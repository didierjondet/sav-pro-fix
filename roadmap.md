# Roadmap

- [x] Remplacer les anciennes adresses officielles de contact Fixway par fixwaypro@gmail.com sur le site et les formulaires, sans changer les comptes de connexion.

- [ ] Parcours devis : temps réel (publication quotes), statut/pastille acceptés, impression à la transformation en SAV (plan approuvé, en cours)
- [ ] Règle de suppression des magasins inactifs : régler la valeur 90 jours en base (requête annulée précédemment ; UI + fonction déjà écrites)
- [ ] Stripe : nettoyer doublons packs SMS (désactiver 10€/70, 40€/250, 35€/500)
- [ ] Stripe : colonne sms_packages.stripe_price_id + création produits/prix Stripe pour les 5 packs
- [ ] Stripe : fonction sync-stripe-product (Super Admin → Stripe, temps réel)
- [ ] Stripe : purchase-sms-package utilise stripe_price_id
- [ ] Stripe : appel de la réplication depuis SubscriptionPlansManager et gestionnaire packs SMS
