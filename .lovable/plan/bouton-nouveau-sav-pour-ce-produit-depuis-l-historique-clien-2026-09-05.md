# Bouton « Nouveau SAV pour ce produit » depuis l'historique client et les dossiers clôturés

## Objectif

Permettre de relancer un dossier SAV sur un appareil déjà réparé, sans ressaisir les références de l'appareil : marque, modèle, IMEI, SKU, type de SAV et client sont repris automatiquement, seule la nouvelle panne est à saisir.

## Où le bouton apparaîtra

1. **Fiche activité d'un client** (popup « Activité de … ») : sur chaque ligne de SAV de l'historique, un bouton « Nouveau SAV pour ce produit ».
2. **Cartes de la liste SAV** : le bouton n'apparaît que sur les dossiers dont le statut est un statut de clôture (Prêt, Prêt et clôturé, Livré, etc. — tout statut marqué comme final dans les réglages), à côté de « Voir » et « Imprimer ». Les statuts d'annulation sont exclus.

## Comportement

Le clic ouvre la fenêtre déjà existante « Nouveau SAV pour ce produit » :
- rappel de l'appareil et du dossier d'origine,
- type de SAV pré-sélectionné (modifiable),
- client : même client / autre client / sans client,
- champ obligatoire « Description de la panne » (la nouvelle cause),
- création puis ouverture directe du nouveau dossier.

Aucun montant, aucune pièce et aucun commentaire de l'ancien dossier ne sont recopiés : le nouveau dossier repart à zéro côté coûts.

## Détails techniques

- Réutilisation de `src/components/sav/NewSAVFromProductDialog.tsx` (aucun changement de logique de création, seulement l'ajout d'un affichage optionnel du libellé du bouton déclencheur côté appelants).
- Nouveau petit composant `src/components/sav/NewSAVFromProductButton.tsx` : reçoit un dossier source, gère l'état d'ouverture et rend le dialogue. Évite de dupliquer l'état dans chaque écran.
- `src/hooks/useCustomerActivity.ts` : ajout des champs `device_brand`, `device_model`, `device_imei`, `sku`, `tracked_product_id`, `sav_type`, `customer_id` dans la requête SAV et dans l'objet `CustomerActivity` (nouveau sous-objet `savSource`), afin d'alimenter le dialogue sans requête supplémentaire.
- `src/components/customers/CustomerActivityDialog.tsx` : bouton rendu uniquement pour `activity.type === 'sav'`, en bas de la carte d'activité.
- `src/pages/SAVList.tsx` : bouton rendu quand `isFinalStatus(savCase.status)` est vrai et que le statut n'est pas un statut d'annulation (`isCancelledStatus` de `useShopSAVStatuses`), dans la barre d'actions existante (vue standard et vue compacte).
- Le champ `tracked_product_id` du dossier source est transmis pour conserver le lien de suivi produit ; à défaut il reste `null` et la détection IMEI/SKU existante prend le relais.

## Hors périmètre

Aucune modification des formulaires de création existants, du calcul des marges, ni du design des cartes au-delà de l'ajout du bouton dans la zone d'actions déjà présente.
