# Rachat : vrai compte particulier, photos facultatives, envoi de l'offre

## Constat
- Côté magasin, les changements existent déjà dans le code (coordonnées cachées derrière « Voir les coordonnées du client », envoi par SMS / e-mail dans « Chiffrer »). Ils ne sont pas encore **publiés** : c'est pour ça que vous ne les voyez pas sur fixway.fr. Ils seront publiés avec ce chantier, puis vérifiés à l'écran.
- Aujourd'hui le « compte vendeur » n'est qu'une fiche créée à partir du formulaire, sans connexion possible. Il faut un vrai compte.
- L'étape 3 bloque tant que les photos obligatoires manquent.

## 1. Formulaire de cotation en 7 étapes
1. État de fonctionnement
2. Appareil (catégorie, marque, modèle)
3. Photos **facultatives** : le formulaire reste en place, avec la mention visible « Pour améliorer la justesse du prix, vous pouvez ajouter des photos ». Bouton « Continuer sans photo ».
4. Analyse IA : faite seulement s'il y a des photos, sinon étape sautée automatiquement.
5. Questions adaptées (suffisent seules pour chiffrer).
6. **Envoi de l'offre** : toute la France (réseau) ou un magasin choisi. Rien d'autre.
7. **Création du compte particulier** :
   - « Continuer avec Google » (compte Gmail), ou e-mail + mot de passe ;
   - si la personne a déjà un compte : « J'ai déjà un compte, me connecter » ;
   - nom, prénom, téléphone, ville / code postal (pré-remplis depuis Google quand possible) ;
   - case de consentement (4 offres/an), non cochée par défaut.
   La demande n'est envoyée qu'une fois le compte créé / connecté. Le message « compte non renseigné » disparaît.

## 2. Espace personnel Fixway du particulier
Nouvel espace « Mon espace » (accessible depuis la page de cotation via « Se connecter », et depuis le lien reçu par SMS / e-mail) :
- **Mes cotations** : toutes ses demandes, offres reçues, accepter / refuser ;
- **Messages** : discussion avec chaque magasin qui a chiffré ;
- **Mes préférences RGPD** : consentement offres SMS / e-mail modifiable, modifier ses coordonnées, supprimer son compte ;
- mot de passe oublié.
Page de connexion particulier séparée de celle des magasins : un particulier ne peut jamais accéder à l'espace de gestion, et inversement.

## 3. Côté magasin
- Carte de cotation : aucune coordonnée affichée ; action « Voir les coordonnées du client » (déjà faite, à publier).
- « Chiffrer » : l'offre est enregistrée et apparaît dans l'espace du client, avec en plus les boutons « Envoyer par SMS » / « Envoyer par e-mail » ; le message contient le lien vers son espace.
- Accès aux messages du client depuis la carte.

## Détails techniques
- Auth : comptes particuliers dans le même système d'authentification, distingués par un rôle `particulier` stocké dans une table dédiée (jamais sur le profil). Le trigger `handle_new_user` est modifié pour **ne pas** créer de profil magasin / boutique quand l'inscription vient du parcours rachat (métadonnée `account_type = 'particulier'`). Garde de routes : les pages magasin refusent ce rôle.
- Google : fournisseur Google déjà configuré pour la connexion magasins ; retour OAuth vers `https://sav-pro-fix.lovable.app/mon-espace` (production, règle existante). En aperçu Lovable, la connexion Google reste limitée comme aujourd'hui.
- Migration : `buyback_customers.user_id` (lien vers le compte, unique), rattachement des fiches existantes par e-mail / téléphone à la première connexion ; RLS : le particulier lit ses propres demandes, offres et messages ; nouvelle table `buyback_messages` (demande, magasin, auteur, texte) avec GRANT + RLS (particulier propriétaire / magasin concerné).
- RPC `submit_buyback_request*` : utilisent `auth.uid()` pour retrouver le compte vendeur au lieu des coordonnées libres.
- `BuybackForm.tsx` : 7 étapes, photos non requises, étape IA sautée sans photo, étape 7 auth. `SellDevice.tsx` / `ShopWebsiteSell.tsx` adaptés.
- Nouvelles pages : `/mon-espace/connexion`, `/mon-espace` (cotations, messages, préférences), `/mon-espace/mot-de-passe`. Lien « Se connecter » sur `/vendre` et `/rachat/:token`.
- `BuybackManager.tsx` : fil de messages par cotation ; textes SMS / e-mail pointent vers `/mon-espace`.
- Publication en production puis vérification Playwright des pages publiques.
