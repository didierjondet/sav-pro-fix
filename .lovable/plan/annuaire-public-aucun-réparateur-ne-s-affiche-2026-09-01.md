# Annuaire public : aucun réparateur ne s'affiche

## Ce que montre la base

Vos deux interrupteurs de visibilité **ont bien été enregistrés** : en base, la fiche
Easycash Agde a `visible_public = true`, `visible_pro = true`, et l'opt-in annuaire du magasin
est actif. Ce n'est donc pas un problème de switch non pris en compte.

Ce qui bloque, c'est un **troisième** interrupteur, « Publier ma fiche », situé beaucoup plus bas
dans la page, dans une autre carte : il est resté à `false`. Or l'annuaire exige les trois
conditions à la fois. D'où l'impression que rien ne se passe.

Deuxième problème : `city` et `postal_code` sont vides sur la fiche. Même publiée, une recherche
« agde » ou « 34300 » ne la trouverait pas. Le `public_name` commence aussi par un espace
(« ␣Easycash Agde »), ce qui dégrade tri et recherche.

## Ce qu'on va faire

### 1. Un seul endroit pour décider de sa visibilité
On supprime l'interrupteur « Publier ma fiche » isolé en bas de page et on fusionne la logique
dans la carte « Où souhaitez-vous apparaître ? » : activer « Visible pour les particuliers » ou
« Visible pour les magasins Fixway » publie automatiquement la fiche ; tout désactiver la dépublie.
Un bandeau d'état affiche en clair « Votre fiche est visible dans l'annuaire public » ou
« Votre fiche n'apparaît dans aucun annuaire », et liste les champs manquants
(nom public, ville, code postal) le cas échéant.

### 2. Ville et code postal requis pour l'annuaire
Marquer ville / code postal comme nécessaires à la publication (avertissement visible, pas de
blocage brutal), et le bouton « Reprendre les infos du magasin » les reprend depuis la fiche Magasin.


### 3. Recherche plus tolérante côté annuaire public
La recherche actuelle exige une correspondance exacte de chaîne. On l'assouplit :
- insensible aux accents et aux espaces superflus
- recherche aussi sur le nom du magasin (`shops.name`), pas seulement le nom public
- code postal : recherche par préfixe (« 343 » remonte « 34300 »)

### 4. Message vide plus utile
Quand aucun résultat, l'annuaire indique que peu d'ateliers sont encore référencés et propose un
lien d'inscription, plutôt qu'un simple « aucun réparateur ».

### 5. Nettoyage de la fiche existante
Retirer l'espace en tête de `public_name` et proposer dans l'interface le remplissage
ville/code postal — la publication effective reste une décision du magasin.

## Détails techniques

- `src/components/settings/PartnerProfileTab.tsx` : suppression du switch `is_published` isolé,
  `is_published` déduit de `visible_public || visible_pro` à l'enregistrement, bandeau d'état et
  contrôle des champs requis.
- Migration : mise à jour de `get_public_partner_directory` et `get_pro_partner_directory`
  (unaccent/trim, jointure sur `shops.name`, code postal en préfixe) + `trim()` sur les
  `public_name` existants.
- `src/pages/PartnersDirectory.tsx` : état vide enrichi.

Aucune fiche n'est publiée automatiquement à la place du magasin.
