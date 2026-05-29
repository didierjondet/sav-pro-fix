## Objectif

Améliorer le rendu PDF du rapport et permettre d'inclure/exclure la section « Performance fournisseurs » comme les autres métriques.

## 1. Switch « Performance fournisseurs » dans le sélecteur

`Reports.tsx` :

- Ajouter un état `includeSuppliers` (bool, défaut `true`).
- Dans la grille existante « Graphiques à inclure dans le rapport » (lignes 533-565), ajouter une case à cocher « Performance fournisseurs » à la suite des widgets, branchée sur `includeSuppliers`.
- Le rendu de `<SupplierPerformanceSection>` (et l'ajout de la feuille « Fournisseurs » dans l'export Excel) ne se fait que si `includeSuppliers === true`.
- Mettre à jour le résumé d'en-tête imprimable (ligne 367-368) pour mentionner « Performance fournisseurs » quand activé.
- Les boutons « Tout sélectionner / désélectionner » couvrent aussi ce switch.

## 2. Mise en page PDF — éviter les coupures et aérer

Dans le bloc `@media print` de `exportToPDF()` :

- Augmenter légèrement la respiration : `font-size` tableau 9px (au lieu de 8), `padding` cellules 4-5px, hauteur de ligne 1.3.
- Forcer chaque carte de section (types SAV, Performance fournisseurs, graphiques) à `page-break-inside: avoid` **uniquement si elle tient sur une page** ; sinon autoriser la coupure mais avec :
  - `thead { display: table-header-group }` pour répéter l'en-tête sur chaque page,
  - `tfoot { display: table-footer-group }` pour les totaux,
  - `tr { page-break-inside: avoid }` (déjà présent, à garder),
  - `caption-side` du titre de carte : ajouter `break-after: avoid` sur les `CardHeader` pour qu'un titre ne reste pas seul en bas de page.
- Pour la section Performance fournisseurs spécifiquement, ajouter une classe stable `print-supplier-section` sur le composant et appliquer :
  - `break-before: auto` mais `break-inside: avoid` si la carte fait moins d'une page (laisser le navigateur décider via `break-inside: avoid` + thead/tfoot repeat pour le cas tableau long).
- Élargir un peu les marges `@page` (10mm au lieu de 8mm) pour de vraies « pages pleines » sans textes collés au bord.
- Ajouter `orphans: 3; widows: 3` sur les `tr` pour limiter les lignes orphelines.

## 3. Composant `SupplierPerformanceSection`

Ajouter `className="print-supplier-section"` sur la `Card` racine (pas de changement visuel à l'écran), pour cibler la section en CSS print.

## Hors périmètre

- Pas de changement du rendu écran des sections existantes.
- Pas de refonte de la palette ni des autres widgets.
- Pas de modification de la requête de données.

## Fichiers touchés

- `src/pages/Reports.tsx` (état switch + condition de rendu + ajustement CSS print + résumé d'en-tête)
- `src/components/reports/SupplierPerformanceSection.tsx` (ajout d'une classe CSS print)
