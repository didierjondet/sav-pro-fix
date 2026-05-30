## Plan de correction

Objectif : garder la présentation plus compacte, mais empêcher les widgets de couper les données quand l’écran est plus étroit.

### 1. Rendre les dimensions adaptatives par taille d’écran
Dans `StatisticsWidgetSizes.ts`, remplacer la logique actuelle trop fixe par un catalogue qui donne une taille différente selon le breakpoint :

- Mobile : 1 colonne, hauteur naturelle du contenu.
- Tablette / écran moyen : largeur limitée à 2 colonnes, mais hauteur augmentée automatiquement pour les widgets denses.
- Desktop : largeur 4 colonnes comme aujourd’hui, avec hauteurs calibrées.

Exemple de principe :

```text
Mobile       : 1 colonne, hauteur auto
Tablette     : 2 colonnes max, widgets hauts si contenu dense
Desktop      : 4 colonnes, grille dense et maîtrisée
```

### 2. Supprimer les blocages qui cachent le contenu
Dans `SortableBlock.tsx`, ajuster le wrapper pour ne plus forcer un masquage trop agressif :

- garder le comportement propre de la grille,
- éviter que `overflow-hidden` coupe les textes, légendes ou graphiques,
- laisser les widgets prendre leur hauteur utile sur mobile et écrans intermédiaires.

### 3. Adapter la grille du dashboard
Dans `SAVDashboard.tsx`, modifier la grille pour qu’elle soit compacte sur desktop mais plus souple sur les écrans autour de 900–1000px, comme le viewport actuel.

Concrètement :

- conserver `grid-auto-flow: dense`,
- garder les rangées fines sur grand écran,
- utiliser des hauteurs automatiques ou plus généreuses sous desktop,
- éviter que deux widgets très denses se retrouvent compressés dans une cellule trop basse.

### 4. Corriger les widgets les plus sensibles
Sans changer leur logique métier, ajuster uniquement leur présentation interne si nécessaire :

- `finance-kpis` : ses cartes internes ne doivent jamais être rognées.
- `monthly-comparison` : graphique + légende + récapitulatif visibles.
- `revenue-breakdown` : graphiques et détail par type visibles sans être coupés.
- `customer-satisfaction` et graphiques moyens : légendes et axes lisibles.

### 5. Vérification visuelle
Après implémentation, vérifier le rendu sur le format actuel proche de `971x696`, puis sur mobile et desktop, pour confirmer que les widgets restent collés mais sans données cachées.