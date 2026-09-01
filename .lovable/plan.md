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

## 4. Annuaire des partenaires (opt-in)

Réglage « Apparaître dans l'annuaire Fixway » (désactivé par défaut). Un magasin qui l'active publie : nom commercial, ville, spécialités, délai moyen, contact pro — jamais ses données internes.

Les autres magasins peuvent rechercher l'annuaire (par nom, ville, spécialité) depuis la création d'un prestataire et créer la fiche pré-remplie + liée en un clic, sans avoir besoin du code.

## 5. Détails techniques

- Migration :
  - `shops.partner_code` (texte unique, généré par trigger sur les nouveaux magasins + backfill), `shops.partner_directory_opt_in`, `shops.partner_public_name/city/specialties`.
  - `shop_sav_providers.linked_shop_id` (FK `shops`, nullable) + `linked_at`.
  - `sav_shares` : `sav_case_id`, `owner_shop_id`, `partner_shop_id`, `assignment_id`, `status` (active/closed), `started_at`, `ended_at` — créée/fermée par trigger sur `sav_provider_assignments` quand le prestataire est lié.
  - `sav_share_messages` : fil inter-magasins (`share_id`, `sender_shop_id`, `sender_user_id`, `content`, `read_at`), ajouté à la publication realtime.
  - GRANTs explicites + RLS sur chaque nouvelle table.
- Confidentialité : le partenaire ne lit jamais `sav_cases` directement. Une vue/RPC `SECURITY DEFINER` `get_shared_sav_cases()` et `get_shared_sav_case(id)` renvoie uniquement les champs autorisés (aucune colonne client, aucun prix de vente), filtrée sur les partages actifs du magasin appelant. Fonction `resolve_partner_code(code)` en `SECURITY DEFINER` pour la liaison (retourne seulement id + nom public).
- RLS `sav_share_messages` : lecture/écriture réservées aux membres des deux magasins du partage.
- Front : `useSharedSAVs`, `usePartnerLink`, `usePartnerDirectory` ; champ code + bandeau lié dans `SAVProvidersManager.tsx` ; section annuaire dans le dialogue de création ; entrée « SAV partenaires » dans `Sidebar.tsx` et vue dédiée dans `SAVList.tsx` ; fil de discussion dans l'onglet Prestataire de `SAVDetail.tsx` côté maître.
- Aucune modification des SAV, types, statuts ou prestataires existants : tout est additif.
