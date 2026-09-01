# Partage de SAV entre magasins Fixway (partenaires liés)

Objectif : quand un magasin confie un SAV à un prestataire qui est lui aussi utilisateur de Fixway, le dossier apparaît automatiquement dans le fil SAV du partenaire, sans jamais exposer les coordonnées du client final.

## 1. Code partenaire Fixway

Chaque magasin reçoit un **code partenaire** unique et stable (ex. `FW-7K2M-4Q9X`), différent du code d'invitation d'équipe existant. Il est visible et copiable dans Réglages, avec un bouton « Régénérer » en cas de fuite.

C'est ce code que le partenaire communique à ses clients professionnels.

## 2. Liaison depuis la fiche prestataire

Dans la fiche d'un prestataire (Réglages > Prestataires techniques), un nouveau champ « Code partenaire Fixway » :

- code valide → liaison immédiate (pas de validation à distance) ; la fiche affiche un bandeau « Partenaire Fixway connecté » avec le nom réel du magasin partenaire et sa pastille de vérification ;
- code inconnu → message d'erreur, rien n'est modifié ;
- bouton « Délier » à tout moment (les partages en cours sont alors coupés).

Point clé d'architecture : la fiche prestataire locale reste la propriété du magasin (il garde son nom, sa couleur, ses notes). La liaison n'est qu'un pointeur vers le magasin partenaire réel. Dix magasins peuvent donc nommer différemment le même partenaire tout en pointant vers la même fiche Fixway.

## 3. Ce que voit le partenaire

Un nouvel espace « SAV partenaires » (onglet/filtre dans la liste SAV, avec compteur dans la barre latérale) liste les dossiers qui lui sont confiés par d'autres magasins.

Pour chaque dossier partagé, le partenaire voit :
- la référence dossier, le magasin donneur d'ordre, la date d'envoi,
- l'appareil : marque, modèle, couleur, IMEI/série, accessoires,
- la description de la panne, le diagnostic, les photos/vidéos du diagnostic,
- les codes de déverrouillage s'il y en a,
- le motif d'envoi, la référence externe, le coût prévu.

Il ne voit **jamais** le nom, le téléphone, l'email ou l'adresse du client final, ni les prix de vente du magasin.

Droits : lecture + échanges. Le partenaire peut écrire dans un fil de discussion inter-magasins rattaché au dossier (visible du magasin maître, jamais du client final), avec notifications temps réel des deux côtés. Il ne peut pas modifier le dossier lui-même.

Le partage démarre à l'attribution du SAV au prestataire lié, et s'arrête automatiquement quand le dossier est marqué « retour reçu » ou que l'attribution est retirée (le fil de discussion reste consultable en historique).

## 4. Fiche partenaire (vitrine professionnelle)

Tout abonné Fixway peut choisir de devenir partenaire technique et se publier. Un nouvel onglet Réglages « Ma fiche partenaire » permet de remplir :

- identité publique : nom commercial, logo, ville/département, zone d'intervention, contact pro,
- présentation : description de l'activité, spécialités, certifications, garanties offertes,
- process de travail : mode d'envoi (dépôt, colis, coursier), délai moyen, conditions de retour, politique en cas d'échec (« pas de réparation, pas de frais » par exemple),
- grille tarifaire : lignes libres (intitulé de la prestation, appareil/famille concernée, prix public, prix professionnel, délai, note). Chaque ligne peut être marquée « publique » et/ou « réservée aux magasins ».

Tant que la fiche n'est pas publiée, rien n'est visible. Publication = interrupteur explicite.

## 5. Prix HT / TTC

Les prix de la grille sont saisis dans l'unité choisie par le magasin (réglage TVA existant : assujetti ou non, taux par défaut). L'affichage indique toujours clairement « HT » ou « TTC » :

- magasin non assujetti à la TVA : les prix sont affichés tels quels avec la mention « TVA non applicable, art. 293 B du CGI »,
- magasin assujetti : les deux valeurs sont calculées et affichées (HT et TTC) via la logique TVA déjà en place,
- dans l'annuaire public (grand public), c'est le prix TTC qui est mis en avant ; dans l'annuaire pro (entre magasins Fixway), c'est le prix HT professionnel.

## 6. Deux annuaires distincts

**Annuaire public (landing)** — nouvelle page publique « Trouver un réparateur / partenaire », référencée depuis la landing page (entrée dans le menu, bloc dédié dans la page d'accueil, page indexable SEO avec JSON-LD LocalBusiness) :
- recherche par ville, appareil, spécialité,
- liste de fiches, puis page détaillée par partenaire : présentation, process, spécialités, garanties, tarifs **publics** uniquement, formulaire/bouton de contact,
- aucun tarif professionnel ni donnée interne n'y apparaît.

**Annuaire pro (dans Fixway)** — accessible depuis « Prestataires techniques » → « Rechercher un partenaire » :
- mêmes fiches, mais réservées aux magasins connectés : on y voit en plus la **grille tarifaire professionnelle**, le code partenaire et le bouton « Ajouter comme prestataire » qui crée la fiche locale déjà liée,
- possibilité de lier manuellement par code, comme prévu au point 2.

## 7. Détails techniques

- Migration :
  - `shops.partner_code` (texte unique, trigger sur les nouveaux magasins + backfill), `shops.partner_directory_opt_in`.
  - `partner_profiles` : `shop_id` (unique), `public_name`, `logo_url`, `city`, `postal_code`, `coverage_area`, `public_phone`, `public_email`, `description`, `specialties`, `certifications`, `warranty_terms`, `shipping_modes`, `avg_delay_days`, `return_policy`, `failure_policy`, `prices_include_vat`, `vat_rate`, `is_published`.
  - `partner_price_items` : `profile_id`, `label`, `device_family`, `public_price`, `pro_price`, `delay_days`, `note`, `visible_public`, `visible_pro`, `display_order`.
  - `shop_sav_providers.linked_shop_id` (FK `shops`, nullable) + `linked_at`.
  - `sav_shares` : `sav_case_id`, `owner_shop_id`, `partner_shop_id`, `assignment_id`, `status`, `started_at`, `ended_at` — créée/fermée par trigger sur `sav_provider_assignments` quand le prestataire est lié.
  - `sav_share_messages` : fil inter-magasins (`share_id`, `sender_shop_id`, `sender_user_id`, `content`, `read_at`), ajouté à la publication realtime.
  - GRANTs explicites + RLS sur chaque nouvelle table.
- Confidentialité :
  - le partenaire ne lit jamais `sav_cases` directement : RPC `SECURITY DEFINER` `get_shared_sav_cases()` / `get_shared_sav_case(id)` limitées aux champs autorisés (aucune donnée client, aucun prix de vente) et aux partages actifs du magasin appelant ; `resolve_partner_code(code)` pour la liaison.
  - annuaire public : RPC `SECURITY DEFINER` `get_public_partner_directory()` / `get_public_partner(slug)` renvoyant uniquement les fiches publiées et les lignes tarifaires `visible_public` — accessible en `anon`, sans exposer la table.
  - annuaire pro : RPC réservée aux utilisateurs authentifiés, ajoutant les tarifs `visible_pro` et le code partenaire.
- TVA : réutilisation de `src/lib/vatCalculator.ts` et de la configuration `shop_billing_config` pour dériver HT/TTC et la mention d'exonération.
- Front :
  - hooks `useSharedSAVs`, `usePartnerLink`, `usePartnerProfile`, `usePartnerDirectory`.
  - Réglages : onglet « Ma fiche partenaire » (identité, process, grille tarifaire, publication) ; champ code + bandeau lié + recherche annuaire dans `SAVProvidersManager.tsx`.
  - App : entrée « SAV partenaires » dans `Sidebar.tsx`, vue dédiée dans `SAVList.tsx`, fil de discussion dans l'onglet Prestataire de `SAVDetail.tsx`.
  - Public : pages `/partenaires` et `/partenaires/:slug`, entrée dans `LandingHeader`, bloc dédié sur la landing, SEO (titre/description, JSON-LD LocalBusiness, sitemap).
- Aucune modification des SAV, types, statuts, prestataires ou de la logique existante : tout est additif.

