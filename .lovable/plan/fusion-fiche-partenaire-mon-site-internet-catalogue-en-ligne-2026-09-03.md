# Fusion « Fiche partenaire » → « Mon site internet » + catalogue en ligne

## Objectif
Supprimer la confusion entre la fiche partenaire (annuaire) et le site internet : un seul endroit de configuration, le site. Tout ce qui est indispensable dans la fiche est réimplanté dans la configuration du site, et la grille tarifaire devient un vrai catalogue alimenté depuis les pièces et prestations déjà saisies dans le stock.

## 1. Réorganisation des réglages (famille « Mon magasin »)
La famille « Mon magasin » passe de 5 onglets à des sous-catégories plus claires :

```text
Mon magasin
├── Informations           (identité, coordonnées, logo — onglet Magasin actuel)
├── Mon site internet      (nouvel onglet unifié, en sous-sections internes)
│     ├── Publication & adresse (activation, URL, statut en ligne)
│     ├── Présentation        (slogan, à propos, photos, horaires)
│     ├── Visibilité & annuaire (code partenaire, particuliers / pros, spécialités, certifications, zone, garanties)
│     ├── Catalogue en ligne   (pièces + prestations publiées, prix public / pro, TVA)
│     └── Rachat d'appareils   (existant)
├── Apparence
└── Notifications
```

L'onglet « Vitrine partenaire » disparaît de la navigation.

## 2. Ce qui est repris de la fiche partenaire
Réimplanté dans « Mon site internet » :
- Bouton **« Reprendre les infos du magasin »** (pré-remplit nom public, ville, code postal, téléphone, email, logo, description) — placé en haut de la section Présentation.
- **Code partenaire Fixway** + copie + interrupteur « Apparaître dans l'annuaire Fixway ».
- **Où souhaitez-vous apparaître ?** : visible par les particuliers / visible par les magasins Fixway, avec le bandeau d'état et les champs manquants.
- **Spécialités** (tags), **certifications**, zone d'intervention, délai moyen, modes d'envoi, garanties, retour, politique en cas d'échec.
- **TVA** : exonération, prix TTC/HT, taux — appliquée à l'affichage des prix du site et de l'annuaire.

Le site public et la fiche annuaire restent alimentés par la même configuration : activer le site publie aussi la fiche si la visibilité est cochée.

## 3. Catalogue en ligne (fin de la double saisie)
Aujourd'hui la grille tarifaire se ressaisit à la main. Nouveau fonctionnement :
- Bouton **« Ajouter depuis mon stock »** : liste des pièces et prestations existantes avec cases à cocher (multi-sélection, recherche, filtre pièce / prestation), publication en un clic.
- Chaque ligne du catalogue a un **switch « Publié »** + visibilité particuliers / pros séparée, prix public, prix pro, délai, note.
- Prix repris automatiquement de la fiche article, modifiable pour le web sans toucher au stock.
- **Article combiné** : possibilité de créer une ligne regroupant plusieurs éléments (ex. « Écran iPhone 13 posé » = pièce physique + prestation), avec prix total calculé puis ajustable.
- Le site public et la fiche annuaire affichent ce catalogue unique (fin de la table de services séparée).

## 4. Nettoyage
- Suppression du composant fiche partenaire des réglages et de l'onglet associé.
- Suppression de l'ancien composant de gestion de site inutilisé (`ShopWebsiteManager`) et des routes/écrans redondants.
- Abandon de la table de services héritée au profit du catalogue unique.

## Détails techniques
- Onglet unique `website` dans `src/pages/Settings.tsx` ; retrait de `partner-profile` et de `PartnerProfileTab.tsx` ; suppression de `src/components/admin/ShopWebsiteManager.tsx`.
- `ShopWebsiteTab.tsx` découpé en sous-composants (`WebsitePublishSection`, `WebsitePresentationSection`, `WebsiteDirectorySection`, `WebsiteCatalogSection`, `WebsiteBuybackSection`) pour rester lisible ; sauvegarde unique en bas de page (config site + `partner_profiles` en une action).
- Migration : ajout sur `partner_price_items` de `part_id` (référence facultative vers `parts`), `kind` (`part` | `service` | `bundle`), `components` (jsonb pour les articles combinés) et `published` ; grants et RLS alignés sur l'existant.
- RPC `get_shop_website` : renvoie le catalogue depuis `partner_price_items` au lieu de `shop_services` ; `get_public_partner` / annuaire inchangés côté contrat, mêmes lignes filtrées sur `visible_public` / `visible_pro`.
- Nouveau dialogue de sélection multiple s'appuyant sur `useParts` (filtre `is_service`) pour créer les lignes catalogue en lot.
- `ShopWebsite.tsx` (page publique) affiche le catalogue avec `formatPartnerPrice` et les réglages TVA de la fiche.
