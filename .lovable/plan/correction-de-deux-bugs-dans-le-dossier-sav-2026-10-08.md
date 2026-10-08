# Correction de deux bugs dans le dossier SAV

## Bug 1 — Note privée de « Gestion des statuts » jamais enregistrée
Cause constatée : la zone « Notes privées (optionnel) » démarre toujours vide (elle ne relit pas la note existante) et n'est enregistrée qu'avec un changement de statut ou le bouton « Sauvegarder prise en charge », qui reste grisé tant que la prise en charge n'a pas changé. Une note seule ne part donc jamais.

Correction :
- La zone affiche la note privée déjà enregistrée sur le dossier.
- Enregistrement automatique ~1,2 s après la dernière frappe et à la sortie du champ, avec l'indicateur « Enregistrement… / Enregistré à HH:MM ».
- Même chose pour la prise en charge (switches et montant) : enregistrement automatique ; le bouton « Sauvegarder prise en charge » est retiré. La règle « note obligatoire si prise en charge » reste : tant que la note manque, la prise en charge n'est pas enregistrée et le message rouge s'affiche.
- Le bouton « Mettre à jour le statut » reste (c'est une action, pas une sauvegarde de texte).

## Suppression des boutons « Sauvegarder » doublant un enregistrement automatique
- Onglet Aperçu, vue standard et vue simplifiée : retrait des boutons « Sauvegarder » sous « Commentaire technicien » et « Commentaires privés magasin » (déjà enregistrés automatiquement). L'indicateur d'état reste.

## Bug 2 — « Lien de suivi » de l'onglet Communication en 404
Cause constatée : le bouton « Prévisualiser » ouvre `fixway.fr/track/...` sans `https://`, le navigateur le traite comme une adresse interne à la page du dossier, d'où la 404.

Correction : « Prévisualiser » ouvre `https://fixway.fr/track/...` (adresse publique complète) ; « Copier » copie aussi l'adresse complète. Le texte affiché reste identique. Même correction pour la vue standard et simplifiée et pour le QR code généré depuis cette page.

## Détails techniques
- `src/components/sav/SAVStatusManager.tsx` : init `notes` depuis `savCase.private_comments`, autosave debounce vers `sav_cases.private_comments` (+ takeover), suppression du bouton takeover ; ne plus vider `notes` après changement de statut.
- `src/pages/SAVDetail.tsx` : suppression des 4 boutons Sauvegarder des commentaires ; `generateTrackingUrl` → `${getPublicAppOrigin()}/track/${slug}`.
- Aucune modification de base de données.
