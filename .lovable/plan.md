# Archiver un type de SAV

Objectif : pouvoir retirer un type de SAV de l'usage courant sans le supprimer, pour conserver l'historique des dossiers déjà créés avec ce type.

## Ce qui change

**Sur chaque ligne de type de SAV (Réglages → Types de SAV)**
- Un nouveau bouton « Archiver » (icône carton) à côté de modifier / supprimer, avec une demande de confirmation expliquant que le type disparaîtra de tous les choix mais que les dossiers existants gardent leur type.
- Une fois archivé, le type disparaît immédiatement : liste des types, création d'un SAV (vue normale et simplifiée), barre latérale, filtres, statistiques en cours, partout où l'on choisit un type.

**Deux onglets en haut du gestionnaire**
- « Actifs » : la liste actuelle, inchangée.
- « Archivés » (avec compteur) : les types archivés, affichés en grisé avec la même présentation, et un bouton « Réactiver » qui les remet aussitôt dans la liste active. La suppression définitive reste possible depuis cet onglet si le type n'a jamais servi.

**Historique préservé**
- Les dossiers SAV déjà créés avec un type archivé continuent d'afficher son nom et sa couleur (fiche SAV, impressions, rapports) : rien n'est effacé.

## Détails techniques

- Pas de nouvelle colonne : la colonne existante `shop_sav_types.is_active` sert d'état d'archivage (elle est déjà le filtre utilisé par `useShopSAVTypes`, source unique des types dans toute l'application). Archiver = `is_active = false`, réactiver = `true`.
- `src/components/sav/SAVTypesManager.tsx` : ajout d'un `Tabs` Actifs / Archivés, d'un bouton Archiver/Réactiver avec `AlertDialog`, et d'une requête locale des types archivés (`shop_sav_types` où `is_active = false`, triés par `display_order`) rafraîchie après chaque action ainsi que via `onRefresh`.
- Aucun changement des autres écrans : ils consomment déjà `useShopSAVTypes` filtré sur `is_active = true`.
- Le rendu des couleurs/libellés dans les dossiers existants passe par `getTypeInfo`, qui garde son repli sur le libellé enregistré ; vérification que les types archivés restent résolus (sinon ajout d'un repli sur les types archivés chargés à la demande dans la fiche SAV).
- Aucune migration de base de données.
