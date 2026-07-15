# Option layout : QR pivoté à gauche du texte

Ajouter un choix de disposition dans les réglages d'étiquette pour placer le code-barres/QR à gauche (pivoté 90° antihoraire) sur toute la hauteur, avec le texte à sa droite.

## Ce qui change

### 1. `SAVBarcodePrinterSettings.tsx`
- Nouveau champ dans `LabelPrinterSettings` :
  - `barcodeLayout: 'stacked' | 'left-rotated'` (défaut `stacked` — layout actuel inchangé).
- Nouveau bloc UI "Disposition du code-barres" avec 2 vignettes cliquables (mini-aperçus SVG) :
  - **Empilé** (actuel) : texte en haut, barcode en bas horizontal.
  - **Barcode à gauche pivoté 90°** : barcode vertical collé à gauche, texte à droite.
- Persistance dans le même `localStorage` (`fixway_label_printer_settings`), migration douce (défaut `stacked` si absent).

### 2. `SAVBarcode.tsx`
- Aperçu interne : quand `barcodeLayout === 'left-rotated'`, rend une grille `[barcode vertical | texte]` au lieu de la pile actuelle. Le canvas garde ses proportions naturelles, on applique `transform: rotate(-90deg)` sur son conteneur.
- Impression (`handlePrint`) : dans le HTML injecté, si `left-rotated`, remplace le layout `.label` flex-column par une grille CSS 2 colonnes :
  - Colonne gauche : largeur ≈ 30 % de la boîte, `.bc` avec `transform: rotate(-90deg)`, dimensions échangées pour occuper toute la hauteur.
  - Colonne droite : texte (type, client, appareil, panne) empilé verticalement, aligné à gauche, tailles de police inchangées.
- Aucun changement des autres modes ; la rotation globale du contenu (`rotateContent`) reste appliquée par-dessus.

## Ce qui ne change pas
- Aucune nouvelle dépendance, aucun changement DB / edge function.
- La base `labelPrinters.ts`, les presets, le layout empilé actuel restent identiques.
- Les autres modules d'impression (PDF SAV, devis) ne sont pas touchés.

## Fichiers touchés
- **Édité** : `src/components/sav/SAVBarcodePrinterSettings.tsx`
- **Édité** : `src/components/sav/SAVBarcode.tsx`
