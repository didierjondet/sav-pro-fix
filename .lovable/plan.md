# Ergonomie : popup devis et popup ajout de pièces (SAV)

Trois améliorations visuelles, sans changement de logique métier ni de base de données.

## 1. Popup "Devis" depuis un SAV plus large

Le formulaire de devis est contraint à une largeur fixe centrée à l'intérieur d'une popup bien plus large, d'où le texte "tout petit au centre".

- Dans `QuoteForm.tsx`, le conteneur `max-w-4xl mx-auto` devient pleine largeur quand le formulaire est affiché dans une popup (via la prop `hideHeader` déjà existante, ou une nouvelle prop `fullWidth`). La page Devis autonome garde son rendu actuel.
- Dans `SAVQuotesTab.tsx`, la popup passe de `max-w-5xl` à une largeur responsive : `w-[95vw] max-w-6xl`.

## 2. Popup "Ajouter une pièce" plus grande et liste plus lisible

Dans `SAVPartsEditor.tsx` :

- Popup : `w-[95vw] max-w-6xl`, hauteur `max-h-[92vh]` avec zone de contenu scrollable.
- Liste des résultats de recherche : hauteur passée de `max-h-40` (environ 2 lignes visibles) à environ `max-h-[45vh]`, avec ascenseur plus large/visible et lignes mieux espacées, pour voir une dizaine de pièces d'un coup.
- Les résultats restent groupés dans un cadre avec séparateurs, badges de stock et bouton d'ajout inchangés.

## 3. Pré-remplissage de la recherche avec le modèle de l'appareil

- `SAVPartsEditor` reçoit une nouvelle prop optionnelle `defaultSearch` (marque + modèle du SAV).
- À l'ouverture de la popup, le champ de recherche est pré-rempli avec cette valeur et les résultats s'affichent immédiatement ; le champ reste entièrement modifiable/effaçable.
- `SAVPartsRequirements` transmet cette valeur ; elle provient du dossier SAV (`device_brand` + `device_model`), déjà chargé côté SAV et sinon récupéré avec les pièces du dossier.

## Détails techniques

- Fichiers touchés : `src/components/quotes/QuoteForm.tsx`, `src/components/sav/SAVQuotesTab.tsx`, `src/components/sav/SAVPartsEditor.tsx`, `src/components/sav/SAVPartsRequirements.tsx` (passage de prop uniquement).
- Aucune modification des hooks, des calculs de prix/TVA, des enregistrements ou du schéma.
- Classes Tailwind sémantiques uniquement, comportement identique en mode sombre et sur mobile (largeurs en `vw`).
