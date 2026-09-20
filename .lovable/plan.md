# Rachat : pastille, comptes clients et nouveau formulaire de cotation

Trois chantiers liés au rachat de matériel.

## 1. Pastille de demandes dans le menu

Ajout d'une pastille sur la ligne « Rachat matériel » du menu de gauche, comme pour Agenda et Devis :

- pastille rouge : demandes privées reçues par le magasin et non traitées ;
- pastille grise : cotations réseau ouvertes sur lesquelles le magasin n'a pas encore chiffré.

Mise à jour en temps réel (même mécanisme que les autres compteurs du menu).

## 2. Compte client automatique à la fin de la cotation

Le compte est créé à la fin du formulaire, avec les coordonnées saisies à l'étape 6 : ce n'est pas un simple formulaire d'envoi, c'est bien la création (ou la reconnaissance) du compte vendeur. Pas de mot de passe : l'accès se fait par le lien personnel envoyé par SMS/e-mail, qui donne accès à toutes ses cotations.

Deux niveaux, pour éviter de casser la base clients des magasins :

- **Compte vendeur national** (nouvelle table) : une fiche unique par personne, reconnue par téléphone (et e-mail), qui regroupe toutes ses cotations, quel que soit le magasin. Elle n'appartient à aucun magasin.
- **Fiche client du magasin** (base `customers` existante) : créée dans chaque magasin concerné, pour qu'il puisse rappeler ou envoyer sa cotation avec les outils habituels (SMS, messagerie, SAV, devis).

Un client n'est donc jamais « attaché » définitivement à un magasin : il est rattaché à une cotation. Concrètement :

- cotation envoyée à un magasin précis → fiche client créée dans ce magasin, rattachée au compte national ;
- cotation nationale → aucune fiche magasin au départ ; elle est créée chez chaque magasin au moment où il chiffre l'appareil ;
- **nouvelle cotation plus tard chez un autre magasin** → le compte national est retrouvé grâce au téléphone, les coordonnées sont pré-remplies, et une nouvelle fiche client est créée chez ce second magasin. Les deux magasins gardent chacun leur fiche et leur historique, sans se voir mutuellement ;
- offre refusée / demande rouverte au réseau → l'ancienne fiche magasin reste (historique), une nouvelle est créée chez le magasin suivant ;
- si le client revient chez un magasin qu'il connaît déjà, sa fiche existante est réutilisée (pas de doublon), avec l'historique complet de ses cotations chez ce magasin.

Côté magasin, la demande de rachat affiche un lien direct vers la fiche client et son historique.


## 3. Formulaire de cotation entièrement refait

Le formulaire actuel est remplacé par un parcours linéaire en 6 étapes, une seule question à l'écran, barre de progression, retour possible :

1. **État de fonctionnement** — 3 choix : fonctionne à 100 % / fonctionne partiellement / ne fonctionne pas. C'est cette réponse qui conditionne toute la suite.
2. **Appareil** — catégorie, marque, modèle (aide à la saisie, saisie libre possible).
3. **Photos** — 3 à 4 photos avec consignes de prise de vue illustrées, prise directe par l'appareil photo du téléphone ou choix dans la galerie, aperçu et suppression possibles.
4. **Analyse IA** — l'IA examine les photos et l'état déclaré, puis affiche en clair l'état général qu'elle constate (écran, châssis, usure, doutes). Le client peut corriger.
5. **Questions adaptées** — questions générées pour le modèle exact (capacité, batterie, verrouillage du compte, accessoires, symptômes…), courtes et enchaînées ; obligatoires uniquement quand c'est déterminant pour chiffrer.
6. **Destination puis compte** — envoi à toute la France ou à un magasin choisi (recherche par nom/ville/code postal, magasins invisibles exclus), puis nom, prénom, téléphone, e-mail, ville/code postal : c'est la création du compte vendeur. Si le téléphone est déjà connu, les champs sont pré-remplis et le compte existant est réutilisé.

À l'envoi : création (ou reconnaissance) du compte vendeur, création de la demande, création de la fiche client chez le magasin destinataire le cas échéant, et redirection vers la page de suivi, qui liste aussi les cotations précédentes du compte.


## Détails techniques

- Nouvelle table `buyback_customers` (nom, téléphone, e-mail, ville, CP, téléphone normalisé unique) + `buyback_requests.buyback_customer_id` et `customers.buyback_customer_id`, avec GRANT et RLS (lecture magasin uniquement via ses demandes, écriture par fonction `SECURITY DEFINER`).
- Relation many-to-many de fait : un `buyback_customers` peut avoir N lignes `customers` (une par magasin), contrainte d'unicité `(shop_id, buyback_customer_id)` pour éviter les doublons quand le client revient.
- RPC `submit_buyback_request` / `submit_buyback_request_national` étendues : rapprochement par téléphone normalisé ou création du compte vendeur, puis création/réutilisation de la fiche `customers` du magasin destinataire.
- Création de la fiche magasin aussi au moment de `submit_network_buyback_offer`.

- Pastille : hook `useBuybackBadges` (demandes `pending` du magasin + demandes réseau sans offre du magasin), branché dans `Sidebar.tsx` sur `/rachat`.
- Formulaire : `BuybackForm.tsx` réécrit en assistant par étapes ; `src/lib/buyback.ts` conservé pour les catégories et les questions de repli.
- Analyse photo : nouvelle fonction `buyback-ai-vision` (modèle multimodal via Lovable AI) qui reçoit les images et renvoie l'état constaté ; `buyback-ai-guide` conservée pour les questions par modèle. Échec IA = étape sautée, jamais bloquante.
- `SellDevice.tsx` et `ShopWebsiteSell.tsx` adaptés au nouveau parcours (l'étape destination est intégrée, plus d'`extraStep`).
