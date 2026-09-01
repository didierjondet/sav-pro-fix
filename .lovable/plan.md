# Clarifier « Magasin » et « Ma fiche partenaire »

## Constat

Les deux onglets sont bien distincts techniquement, mais leur contenu se chevauche :
l'onglet Magasin saisit nom, logo, email, téléphone, adresse ; l'onglet Ma fiche partenaire
redemande nom public, logo, ville, code postal, téléphone, email, site web. D'où l'impression
de doublon.

De plus, la fiche partenaire n'a aujourd'hui :
- qu'un seul champ libre « Spécialités » (texte),
- qu'un seul interrupteur global d'annuaire (`partner_directory_opt_in`) + `is_published`,
sans possibilité de dire « je veux être visible comme magasin grand public » ou
« comme prestataire technique pour les autres magasins Fixway », ni les deux.

## Ce qu'on va faire

### 1. Séparer clairement les rôles des deux onglets
- **Magasin** = identité interne/administrative (facturation, PDF, suivi client). Inchangé.
- **Ma fiche partenaire** = vitrine publique + vitrine pro. On y ajoute en tête un bouton
  « Reprendre les infos du magasin » qui pré-remplit nom, logo, téléphone, email, ville,
  code postal depuis la fiche Magasin, au lieu de tout ressaisir. Un bandeau explique
  la différence entre les deux onglets.

### 2. Choisir sa visibilité
Nouvelle carte « Où souhaitez-vous apparaître ? » avec deux interrupteurs indépendants :
- **Visible pour les particuliers** (annuaire public /partenaires, tarifs publics)
- **Visible pour les magasins Fixway** (annuaire professionnel, tarifs pro, réception de SAV délégués)

On peut activer l'un, l'autre ou les deux. Les champs et les grilles tarifaires affichés
s'adaptent : si seul le mode pro est actif, les colonnes/tarifs publics sont masqués, et
inversement. Le bouton « Voir ma page publique » n'apparaît que si la visibilité publique est active.

### 3. Spécialités structurées
Remplacement du champ texte libre par une sélection multiple de spécialités
(micro-soudure, écrans, batteries, désoxydation, récupération de données, consoles,
informatique/PC, tablettes, objets connectés, électroménager…) + possibilité d'ajouter
une spécialité personnalisée. Ces spécialités deviennent des badges filtrables dans
l'annuaire public et dans la recherche partenaire côté magasin.

### 4. Répercussions
- Annuaire public `/partenaires` : n'affiche que les fiches en visibilité publique,
  avec filtres par spécialité.
- Recherche partenaire côté magasin (fiche prestataire, annuaire pro) : n'affiche que
  les fiches en visibilité pro.
- Fiche publique `/partenaires/:slug` : badges de spécialités, et affichage HT/TTC
  selon les paramètres TVA existants (inchangé).

## Détails techniques

Migration sur `public.partner_profiles` :
- `visible_public boolean not null default false`
- `visible_pro boolean not null default false`
- `specialty_tags text[] not null default '{}'` (le champ texte `specialties` est conservé
  et migré vers les tags pour ne rien perdre)
- Backfill : les fiches déjà publiées et opt-in passent en `visible_public = true` et
  `visible_pro = true` pour ne changer aucun comportement existant.
- Politiques RLS de lecture publique ajustées pour filtrer sur `visible_public`.

Fichiers touchés : `src/components/settings/PartnerProfileTab.tsx` (restructuration en
sections : Code partenaire / Visibilité / Identité vitrine / Activité & spécialités /
Process & garanties / Grille tarifaire), `src/hooks/usePartnerProfile.ts`,
`src/hooks/usePartnerDirectory.ts`, `src/pages/PartnersDirectory.tsx`,
`src/pages/PartnerPublicProfile.tsx`, `src/components/partners/PartnerDirectoryDialog.tsx`,
libellé de l'onglet Settings en « Vitrine partenaire ».

Aucune modification de l'onglet Magasin en dehors d'un court texte d'aiguillage.
