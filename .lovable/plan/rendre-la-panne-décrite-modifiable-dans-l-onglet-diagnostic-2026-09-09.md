# Rendre la panne décrite modifiable dans l'onglet Diagnostic

## Constat

Dans l'onglet Diagnostic d'un SAV, la zone « Panne décrite » reprend la description du dossier
mais elle est affichée en lecture seule : c'est un simple texte, non modifiable.

## Ce qui sera fait

- La zone « Panne décrite » devient une zone de saisie modifiable, pré-remplie avec la description du dossier.
- Le texte saisi sert uniquement au diagnostic IA (analyse initiale, régénération et discussion) :
  **le dossier SAV n'est pas modifié**, la description d'origine reste intacte partout ailleurs.
- Un petit bouton « Rétablir la description d'origine » permet de revenir au texte du dossier.
- Une mention discrète précise que cette modification sert seulement à l'analyse IA.
- Le bouton « Générer le diagnostic » se base sur le texte affiché ; il reste bloqué si la zone est vide.
- Aucun autre élément de l'onglet ne change (photos/vidéos, analyse, discussion).

## Détails techniques

- Fichier : `src/components/sav/SAVDiagnosticTab.tsx` uniquement.
- Nouvel état local `problemText` initialisé depuis `savCase.problem_description`, resynchronisé
  si le dossier change (`useEffect` sur `savCase.id` / `savCase.problem_description`).
- `savContext.problem_description` alimenté par `problemText` (mémoïsé) pour les modes `initial` et `chat`.
- Remplacement du bloc statique par un `Textarea` ; validation de `generateInitial` sur `problemText`.
- Aucune écriture en base, aucune modification de la fonction edge.
