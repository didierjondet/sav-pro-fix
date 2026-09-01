# Annuaire public : aucun réparateur ne s'affiche

## Ce que montre la base

Il n'existe aujourd'hui qu'une seule fiche partenaire (Easycash Agde) et elle n'est **pas publiée** :

- `is_published = false` → l'annuaire public la filtre systématiquement
- `city` et `postal_code` sont **vides** → même publiée, une recherche « agde » ou « 34300 » ne la trouverait pas
- `public_name` commence par un espace (« ␣Easycash Agde ») → tri et affichage dégradés
- Les autres réglages sont bons : `visible_public`, `visible_pro` et l'opt-in annuaire du magasin sont à `true`

Donc l'annuaire fonctionne, mais il n'a réellement aucune fiche éligible à afficher.

## Ce qu'on va faire

### 1. Rendre la publication évidente dans « Vitrine partenaire »
Aujourd'hui l'interrupteur « Publier ma fiche » est isolé en bas de page, loin de la carte
« Où souhaitez-vous apparaître ? ». On le remonte dans cette carte, avec un bandeau d'état clair :
- fiche non publiée → bandeau orange « Votre fiche n'apparaît dans aucun annuaire »
- champs obligatoires manquants (nom public, ville, code postal) → liste explicite des champs à
  remplir, et publication signalée comme incomplète.

### 2. Ville et code postal requis pour l'annuaire
Marquer ville / code postal comme nécessaires à la publication (avertissement, pas de blocage
brutal), et le bouton « Reprendre les infos du magasin » les reprend depuis la fiche Magasin.

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

- `src/components/settings/PartnerProfileTab.tsx` : déplacement du switch `is_published` dans la
  carte visibilité, bandeau d'état, contrôle des champs requis.
- Migration : mise à jour de `get_public_partner_directory` et `get_pro_partner_directory`
  (unaccent/trim, jointure sur `shops.name`, code postal en préfixe) + `trim()` sur les
  `public_name` existants.
- `src/pages/PartnersDirectory.tsx` : état vide enrichi.

Aucune fiche n'est publiée automatiquement à la place du magasin.
