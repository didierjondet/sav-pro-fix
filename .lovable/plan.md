

## Plan : ajouter l'IA de reformulation au wizard SAV + impression des pièces jointes

### Partie 1 — Reformulation IA dans le wizard simplifié

Ajouter le composant `AITextReformulator` (déjà utilisé partout ailleurs) dans le `SAVWizardDialog.tsx`, à l'identique du `SAVForm.tsx` standard.

**Modification ciblée**
- Fichier : `src/components/sav/SAVWizardDialog.tsx`
- Étape concernée : `case 'problem'` (étape 3/6)
- Ajouter l'import `AITextReformulator`
- Aligner le `Label "Description du problème *"` avec le bouton IA dans une même ligne flex, comme dans `SAVForm`
- `context="problem_description"`
- `onReformulated` met à jour `deviceInfo.problemDescription`

Aucune autre étape du wizard n'a de zone de texte libre nécessitant l'IA.

### Partie 2 — Impression des pièces jointes (photos + documents)

**Constat**
Le composant `SAVPrint.tsx` génère le document de restitution PDF mais ne contient aucune logique pour les pièces jointes (`attachments`) du SAV. Les photos de l'appareil et les documents associés ne sont donc jamais imprimés, ni depuis le wizard, ni depuis le détail SAV, ni depuis le bloc `SAVDocuments`.

**Travaux à réaliser**

1. Dans `src/components/sav/SAVPrint.tsx`
   - À la fin du document de restitution, ajouter une section conditionnelle « Pièces jointes » qui n'apparaît que si `savCase.attachments?.length > 0`
   - Pour chaque pièce jointe :
     - Image (`image/*` ou extension jpg/jpeg/png/gif/webp) → afficher en miniature inline dans le PDF (largeur max ~45 % de page, hauteur max raisonnable, conserver le ratio, éviter de couper entre deux pages)
     - PDF / Word / autres → afficher l'icône fichier + nom du fichier + URL accessible (lien cliquable dans le PDF imprimé)
   - Préserver la mise en page A4 compacte existante (mémoire `pdf-restitution-layout-compactness`)
   - Ne casser ni la pagination, ni les sections existantes (historique, clôtures cumulées)

2. Dans `src/components/sav/SAVDocuments.tsx`
   - Ajouter un bouton « Imprimer les pièces jointes » dans l'en-tête de la carte (à côté du bouton d'upload)
   - Visible uniquement si `normalizedAttachments.length > 0`
   - Au clic : ouvrir une fenêtre d'impression dédiée contenant uniquement les pièces jointes du SAV (images en pleine taille avec saut de page entre chaque, PDF référencés en lien)
   - Utiliser un template HTML auto-contenu ouvert dans un nouvel onglet ou un blob (cohérent avec la mémoire `quote-public-pdf-generation-logic`), pour éviter les problèmes d'iframe et de chargement asynchrone des images

### Points de vigilance
- Les `attachments` peuvent être au format string (ancien) ou objet (nouveau) — réutiliser la normalisation existante de `SAVDocuments.tsx`
- Les images doivent être chargées via `<img onload>` ou `Promise` avant déclenchement de l'impression pour éviter une page blanche
- Respecter la mémoire `user-preferences` : ne rien modifier d'autre dans le wizard (pas de refonte UI, pas de changements de mise en page non demandés)
- Ne pas toucher au composant `AITextReformulator` lui-même (déjà stable)

### Fichiers modifiés
- `src/components/sav/SAVWizardDialog.tsx` — ajout du bouton IA dans l'étape « Problème »
- `src/components/sav/SAVPrint.tsx` — section « Pièces jointes » dans le document de restitution
- `src/components/sav/SAVDocuments.tsx` — bouton d'impression dédié des pièces jointes

### Vérifications après implémentation
- Création SAV via wizard → bouton IA présent et fonctionnel sur l'étape 3 « Problème »
- Impression d'un SAV avec photos → photos visibles dans le PDF de restitution
- Impression d'un SAV avec PDF joint → référence cliquable dans le PDF
- Impression d'un SAV sans pièce jointe → aucune section vide affichée
- Bouton « Imprimer les pièces jointes » visible uniquement quand des pièces jointes existent
- Aucune régression sur le SAV standard ni sur les autres reformulateurs IA

