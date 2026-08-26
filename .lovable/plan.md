# Filtre "Masquer les prêts" par défaut + couleur de l'appareil dans le SAV

## 1. Filtre par défaut depuis le menu de gauche

Aujourd'hui, un clic sur un type de SAV ouvre `/sav?sav_type=...&exclude_ready=true` (filtre "Masquer les prêts" appliqué), mais un clic sur un prestataire ouvre `/sav?provider=...` sans aucun filtre de statut : la liste affiche donc aussi les dossiers déjà prêts/clôturés.

À faire :
- Ajouter `exclude_ready=true` au lien prestataire dans la barre latérale.
- Dans la page SAV, quand l'URL contient un `provider` (ou un `sav_type`) sans paramètre `status` explicite, forcer le filtre de statut sur "Masquer les prêts".

Résultat : quel que soit le point d'entrée du menu de gauche (type de SAV ou prestataire), seuls les dossiers en cours s'affichent par défaut. L'utilisateur peut toujours changer le filtre manuellement.

## 2. Couleur de l'appareil visible dans le SAV

La couleur choisie à la création est bien enregistrée (`device_color`) mais n'est affichée nulle part dans la fiche.

À faire : ajouter dans le bloc "Détails du dossier" (vue standard) et dans le bloc "Appareil & dossier" (vue simplifiée) une ligne "Couleur" avec la pastille de couleur ronde correspondante + son libellé français (Noir, Blanc, Gris, Bleu, Rouge, Or, Argent, Vert, Rose, Violet, Autre). Affichée seulement si une couleur est renseignée.

## Détails techniques

- `src/components/layout/Sidebar.tsx` : ligne de navigation prestataire → `/sav?provider=${id}&exclude_ready=true`.
- `src/pages/SAVList.tsx` : dans l'effet d'initialisation des filtres par URL, si `provider` est présent et `status` absent → `setStatusFilter('all-except-ready')`.
- Nouveau petit helper de mapping couleur (valeur → libellé + code HSL) réutilisant exactement la palette de `SAVForm`/`SAVWizardDialog`, utilisé dans `src/pages/SAVDetail.tsx` aux deux emplacements du résumé.
- Aucun changement de base de données, aucune autre modification d'UI.
