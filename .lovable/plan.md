# Rachat : pastille, comptes clients et nouveau formulaire de cotation

Trois chantiers liés au rachat de matériel.

## 1. Pastille de demandes dans le menu

Ajout d'une pastille sur la ligne « Rachat matériel » du menu de gauche, comme pour Agenda et Devis :

- pastille rouge : demandes privées reçues par le magasin et non traitées ;
- pastille grise : cotations réseau ouvertes sur lesquelles le magasin n'a pas encore chiffré.

Mise à jour en temps réel (même mécanisme que les autres compteurs du menu).

## 2. Compte client automatique à la fin de la cotation

Le particulier n'a pas de mot de passe : son « compte » est sa demande, retrouvée par le lien/QR déjà en place.

Deux niveaux, pour éviter de casser la base clients des magasins :

- **Répertoire national des vendeurs** (nouvelle table) : une fiche unique par personne, reconnue par téléphone + e-mail, qui regroupe toutes ses cotations passées, quel que soit le magasin. Elle n'appartient à aucun magasin.
- **Fiche client du magasin** (base `customers` existante) : créée automatiquement dans le magasin concerné, pour qu'il puisse rappeler ou envoyer sa cotation avec les outils habituels (SMS, messagerie, SAV, devis).

Règles d'attribution :

- cotation envoyée à un magasin précis → fiche client créée immédiatement dans ce magasin ;
- cotation nationale → aucune fiche magasin au départ ; la fiche est créée chez chaque magasin au moment où il chiffre l'appareil, puis le magasin retenu garde la relation ;
- offre refusée / demande rouverte au réseau → l'ancienne fiche magasin reste (historique), une nouvelle est créée chez le nouveau magasin ;
- si la personne revient plus tard, sa fiche nationale est retrouvée (téléphone ou e-mail) : ses coordonnées sont pré-remplies et ses cotations précédentes visibles côté magasin.

Côté magasin, la demande de rachat affiche un lien direct vers la fiche client et son historique.

## 3. Formulaire de cotation entièrement refait

Le formulaire actuel est remplacé par un parcours linéaire en 6 étapes, une seule question à l'écran, barre de progression, retour possible :

1. **État de fonctionnement** — 3 choix : fonctionne à 100 % / fonctionne partiellement / ne fonctionne pas. C'est cette réponse qui conditionne toute la suite.
2. **Appareil** — catégorie, marque, modèle (aide à la saisie, saisie libre possible).
3. **Photos** — 3 à 4 photos avec consignes de prise de vue illustrées, prise directe par l'appareil photo du téléphone ou choix dans la galerie, aperçu et suppression possibles.
4. **Analyse IA** — l'IA examine les photos et l'état déclaré, puis affiche en clair l'état général qu'elle constate (écran, châssis, usure, doutes). Le client peut corriger.
5. **Questions adaptées** — questions générées pour le modèle exact (capacité, batterie, verrouillage du compte, accessoires, symptômes…), courtes et enchaînées ; obligatoires uniquement quand c'est déterminant pour chiffrer.
6. **Destination puis coordonnées** — envoi à toute la France ou à un magasin choisi (recherche par nom/ville/code postal, magasins invisibles exclus), puis nom, prénom, téléphone, e-mail, ville/code postal, et envoi.

À l'envoi : création de la demande, de la fiche nationale, de la fiche magasin le cas échéant, et redirection vers la page de suivi existante.

## Détails techniques

- Nouvelle table `buyback_customers` (nom, téléphone, e-mail, ville, CP, clé de rapprochement normalisée) + `buyback_requests.buyback_customer_id` et `customers.buyback_customer_id`, avec GRANT et RLS (lecture magasin uniquement via ses demandes, écriture par fonction `SECURITY DEFINER`).
- RPC `submit_buyback_request` / `submit_buyback_request_national` étendues : rapprochement ou création de la fiche nationale, création de la fiche `customers` du magasin destinataire, dédoublonnage par téléphone normalisé.
- Création de la fiche magasin aussi au moment de `submit_network_buyback_offer`.
- Pastille : hook `useBuybackBadges` (demandes `pending` du magasin + demandes réseau sans offre du magasin), branché dans `Sidebar.tsx` sur `/rachat`.
- Formulaire : `BuybackForm.tsx` réécrit en assistant par étapes ; `src/lib/buyback.ts` conservé pour les catégories et les questions de repli.
- Analyse photo : nouvelle fonction `buyback-ai-vision` (modèle multimodal via Lovable AI) qui reçoit les images et renvoie l'état constaté ; `buyback-ai-guide` conservée pour les questions par modèle. Échec IA = étape sautée, jamais bloquante.
- `SellDevice.tsx` et `ShopWebsiteSell.tsx` adaptés au nouveau parcours (l'étape destination est intégrée, plus d'`extraStep`).
