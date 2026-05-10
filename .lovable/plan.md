## Mettre en évidence le nom du client sur la fiche de restitution SAV

Sur le PDF de restitution généré (`src/utils/pdfGenerator.ts`, fonction `generateSAVRestitutionPDF`), le nom du client apparaît actuellement comme une simple ligne dans la grille "Informations du dossier", au même format que les autres champs.

### Modification proposée

Ajouter, juste avant le bloc "Informations du dossier" (ligne ~622), un bandeau dédié bien visible affichant le nom du client en grand, uniquement quand un client est renseigné :

- Nom complet en grande taille (≈ 22-24px), gras
- Légère bande de fond colorée (utilisant la couleur primaire du PDF déjà en place) avec coins arrondis
- Libellé discret "Client" au-dessus
- Si pas de client : on n'affiche pas le bandeau (on garde la ligne actuelle "Non renseigné" dans la grille)

La ligne "Client" actuelle dans la grille reste en place pour ne pas casser la mise en page (ou on peut la retirer pour éviter la redondance — à confirmer si souhaité, sinon on la laisse).

### Fichier touché

- `src/utils/pdfGenerator.ts` — ajout d'un bloc HTML/CSS dans le template de `generateSAVRestitutionPDF`

### Hors périmètre

- Pas de changement sur le PDF de devis ni sur la liste SAV imprimée
- Pas de changement sur l'UI de l'app (juste le PDF)
