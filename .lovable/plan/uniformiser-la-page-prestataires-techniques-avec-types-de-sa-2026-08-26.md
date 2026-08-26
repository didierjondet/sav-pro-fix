# Uniformiser la page « Prestataires techniques » avec « Types de SAV »

Objectif : reprendre exactement la même présentation que le gestionnaire des types de SAV, en y ajoutant les informations d'identité, d'activité et de spécialités du prestataire.

## Ce qui change (visuel)

Remplacement du tableau actuel par la même mise en page que les types de SAV :

- En-tête de carte identique : titre à gauche, bouton bleu « Nouveau prestataire » à droite, courte description en dessous.
- Liste sous forme de lignes encadrées (bordure + coins arrondis), une ligne par prestataire :
  - pastille ronde de couleur à gauche,
  - nom en gras, badge « Inactif » si désactivé,
  - sous le nom, la même rangée de micro-informations avec icônes et code couleur vert / orange / rouge : contact, téléphone, email, spécialités, délai moyen, « Visible sidebar » / « Masqué sidebar », « Actif » / « Inactif »,
  - à droite, boutons fantômes crayon (modifier) et corbeille (supprimer) avec la même boîte de confirmation.
- Bloc d'information gris en bas de page (icône i + liste à puces) expliquant les règles : information interne jamais visible par le client, prestataire non supprimable s'il a des dossiers rattachés (le désactiver), rôle des couleurs, comptage dans la barre latérale.

## Dialogue de création / modification

Même structure que le dialogue « type de SAV » : titre + description, corps défilant, pied de page avec « Annuler » / « Créer » ou « Modifier ».

1. Identité : Nom (obligatoire), Contact, Téléphone, Email, Adresse.
2. Activité et spécialités : Spécialités, Délai moyen (jours), Notes internes.
3. Couleur : même double champ (sélecteur de couleur + code hexadécimal éditable), comme pour les types de SAV.
4. Section « Options avancées » avec les interrupteurs au même format (libellé + icône + phrase explicative à gauche, interrupteur à droite) :
   - Afficher dans la barre latérale,
   - Prestataire actif.

## Détails techniques

- Fichier modifié : `src/components/settings/SAVProvidersManager.tsx` (réécriture de la présentation uniquement).
- Aucun changement de base de données : les colonnes existantes de `shop_sav_providers` couvrent identité, activité et spécialités.
- Aucun changement des hooks (`useSAVProviders`), de l'onglet Prestataire du SAV, de la barre latérale ni de la liste SAV.
- Les composants réutilisés sont ceux déjà employés par `SAVTypesManager` : Card, Dialog, Input, NumberInput, Label, Switch, Badge, AlertDialog, icônes lucide.
