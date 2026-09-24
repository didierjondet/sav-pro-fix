# Cotation : doublons, envoi de l'offre, coordonnées et consentement

## 1. Supprimer les questions posées en double (étape 5)

Aujourd'hui les mêmes informations reviennent plusieurs fois : la capacité de stockage, l'état de l'écran, « l'appareil s'allume-t-il ? » (déjà répondu à l'étape 1), la description de la panne (déjà cochée dans les points en panne) et parfois les mêmes questions reformulées par l'assistant.

Ce qui change :

- la question « L'appareil s'allume-t-il ? » disparaît de toutes les catégories : la réponse de l'étape 1 est reprise et affichée en rappel, non modifiable ;
- les questions proposées par l'assistant sont comparées à celles déjà présentes (capacité, écran, batterie, état général…) et celles qui font doublon sont écartées avant affichage ;
- la description libre de la panne n'apparaît qu'une fois, sous la liste des points en panne, et seulement si l'appareil est déclaré en panne ;
- les accessoires ne sont demandés qu'une fois (les cases à cocher), la question texte « accessoires fournis » est retirée ;
- à l'écran, un bandeau rappelle ce qui est déjà connu : état déclaré, marque, modèle.

## 2. Envoyer la cotation au client par SMS ou e-mail

Dans la fenêtre « Chiffrer », après avoir saisi le montant :

- deux boutons « Envoyer par SMS » et « Envoyer par e-mail », actifs seulement si le client a renseigné le canal correspondant ;
- l'offre est d'abord enregistrée, puis le message part avec un texte propre et prêt à lire : magasin, appareil, montant proposé, validité, conditions, et le lien de suivi de la cotation ;
- l'e-mail reprend la même chose en version mise en page ;
- pour une cotation réseau, l'envoi direct reste indisponible tant que le client n'a pas choisi le magasin : les coordonnées ne sont pas communiquées avant.

## 3. Coordonnées du client masquées par défaut

Sur les cartes de cotation, le nom et le téléphone ne s'affichent plus. Un bouton « Voir les coordonnées du client » ouvre une petite fenêtre avec nom, téléphone, e-mail, ville et code postal, avec les raccourcis appeler / écrire, et le lien vers la fiche client du magasin.

## 4. Consentement du client

Côté cotation (dernière étape, sous les coordonnées) : une case à cocher
« J'autorise Fixway et les magasins du réseau à m'envoyer des offres de rachat par SMS et/ou e-mail (4 envois maximum par an). »
Non cochée par défaut, non bloquante, enregistrée sur le compte vendeur et visible côté magasin.

Côté SAV classique : une ligne discrète sur le document remis au client :
« En confiant votre appareil pour diagnostic ou réparation, vous acceptez de recevoir par SMS les informations de suivi de votre dossier, ainsi que d'éventuelles offres de rachat (4 envois maximum par an). »

## Détails techniques

- `src/lib/buyback.ts` : retrait de `ALLUMAGE` des listes, retrait de la question texte `accessoires`, `panne` conservé mais rendu conditionnel côté formulaire.
- `src/components/buyback/BuybackForm.tsx` : dédoublonnage des questions IA par identifiant et par libellé normalisé (sans accents/ponctuation) contre les questions de base et les réponses déjà connues ; bandeau de rappel étape 5 ; case de consentement étape 6 ajoutée au payload.
- Migration : colonne `marketing_consent` (booléen, défaut faux) sur `buyback_customers` ; paramètre ajouté à `buyback_upsert_customer`, `submit_buyback_request` et `submit_buyback_request_national`.
- `src/pages/BuybackManager.tsx` : composition du message de cotation, boutons d'envoi SMS (`send-sms`, type `manual`) et e-mail (`send-app-email`), dialogue « coordonnées du client », suppression des coordonnées des cartes.
- `src/hooks/useBuyback.ts` : mutation `sendOfferMessage` (enregistrement de l'offre puis envoi), exposition du consentement et des coordonnées.
- Mention SAV : ajoutée dans les documents d'entrée générés (`src/components/sav/SAVPrint.tsx` et `src/utils/pdfGenerator.ts`), en petits caractères avec les mentions existantes.
