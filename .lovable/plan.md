# Plan — Corriger l’impression des listes SAV avec les filtres

## Objectif
Faire en sorte que l’impression de la liste SAV respecte réellement les filtres actifs et les mêmes règles d’affichage que le menu gauche pour les types, statuts et prestataires.

## Constat vérifié
- La liste affichée à l’écran applique déjà plusieurs filtres : recherche, type, statut, couleur, grade et prestataire via l’URL.
- La fonction d’impression repart actuellement depuis `cases` puis applique seulement les choix de la popup : types, statuts et prestataires.
- La popup masque déjà les types/statuts/prestataires non visibles dans la barre latérale, mais les statuts et prestataires non cochés signifient “aucun filtre”, donc l’impression peut inclure plus de SAV que la vue filtrée.
- Le PDF affiche seulement Type / Statut / Tri dans l’en-tête, pas le filtre prestataire.

## Changements prévus
1. **Base d’impression = liste filtrée actuelle**
   - Utiliser la même base que la liste affichée à l’écran, avant pagination.
   - Respecter donc automatiquement : recherche, type, statut, couleur, grade, tri et filtre prestataire ouvert depuis le menu gauche.

2. **Popup d’impression cohérente avec les filtres existants**
   - Précocher dans la popup les valeurs correspondant aux filtres actifs quand il y en a.
   - Si aucun filtre actif n’est présent pour un onglet, garder un comportement clair : imprimer tous les éléments visibles de cet onglet.
   - Conserver la règle : seuls les types/statuts/prestataires configurés comme visibles dans la barre latérale apparaissent dans la sélection.

3. **Prestataires : même logique que le menu gauche**
   - Appliquer la visibilité `show_in_sidebar`.
   - Si le réglage “masquer les prestataires vides” est activé, ne proposer dans l’onglet Prestataires que ceux qui ont au moins un SAV actif, comme dans le menu gauche.
   - Garder l’option “Sans prestataire” uniquement si elle peut correspondre à au moins un dossier dans la base imprimable.

4. **Statuts : même logique que le menu gauche**
   - Ne proposer que les statuts actifs et visibles dans la barre latérale.
   - Appliquer correctement la sélection des statuts au résultat imprimé.

5. **Résumé PDF plus explicite**
   - Ajouter dans l’en-tête du document les filtres réellement appliqués : types, statuts, prestataires et filtres de page pertinents.
   - Le compteur imprimé devra correspondre au nombre exact de dossiers après tous les filtres.

## Vérification
- Contrôler que l’impression depuis un filtre prestataire n’imprime que les SAV de ce prestataire.
- Contrôler que l’impression depuis un filtre statut n’imprime que les SAV de ce statut.
- Contrôler que les éléments masqués dans la barre latérale ne sont pas proposés dans la popup.
- Lancer une vérification TypeScript ciblée si nécessaire.

## Hors périmètre
- Aucun changement de base de données.
- Aucun changement sur les réglages de création/modification des types, statuts ou prestataires.
- Aucun changement sur la mise en page générale de la page SAV.
