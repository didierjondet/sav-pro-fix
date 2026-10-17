# Compteurs des pastilles famille selon les filtres actifs

## Constat
Sur la page SAV, le nombre affiché sur chaque pastille (ex. « Smartphone (1191) ») compte **tous** les SAV du magasin, sans tenir compte des filtres choisis (type, statut, couleur, grade, prestataire, recherche).

## Ce qui change
- Chaque pastille affiche le nombre de SAV qui correspondent **aux autres filtres actifs** : type, statut, couleur, grade, prestataire et recherche.
- La sélection de pastilles ne change pas les compteurs des pastilles elles-mêmes. Vous voyez donc toujours combien de SAV vous ajouteriez en cliquant sur une autre famille.
- Le bouton « Toutes » affiche aussi le total correspondant aux filtres.
- Le compteur se met à jour en direct quand un filtre change.
- Rien d'autre ne bouge (aspect, emplacement, liste des SAV).

## Détails techniques
- `SAVList.tsx` : extraire les filtres actuels (hors familles) dans un `useMemo` `casesForFamilyCounts` (prestataire, type, statut, couleur, grade, recherche multi-mots), puis `familyCounts` = Map famille → nombre.
- `filteredAndSortedCases` réutilise cette base puis applique le filtre familles et le tri, pour que les deux calculs restent alignés.
- Le `count` des `FamilyChip` et un `(n)` sur « Toutes » lisent `familyCounts`.
