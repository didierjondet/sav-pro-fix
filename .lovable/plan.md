# Rendre le statut « Pièce(s) à commander » utilisable partout

## Pourquoi ça arrive
Le programme met automatiquement un SAV en « Pièce(s) à commander » quand une pièce manque en stock (création SAV, devis transformé, ajout de pièce, commandes). Mais ce statut n'a jamais été ajouté à la liste des statuts de vos magasins : sur les 36 magasins, aucun ne l'a dans ses statuts configurés. Or le menu de changement de statut, les filtres, la barre latérale et les impressions ne proposent que les statuts configurés du magasin. Résultat : le SAV l'affiche, mais vous ne pouvez ni le choisir ni le filtrer.

## Ce que je propose
1. Ajouter « Pièce(s) à commander » (orange, chronomètre en pause, compté dans les statistiques) aux statuts de chaque magasin existant, placé juste avant « Pièces commandées ».
2. L'ajouter aussi aux statuts créés automatiquement pour les nouveaux magasins.
3. Le marquer comme statut « utilisé par le programme » dans Paramètres > Statuts : vous pouvez changer son nom, sa couleur et son affichage, mais pas le supprimer (sinon les mises à jour automatiques casseraient à nouveau).

Il apparaîtra alors dans le menu de statut d'un SAV, les filtres de la liste, la barre latérale et les impressions, sans autre changement.

## Détails techniques
- Migration : INSERT dans `shop_sav_statuses` (status_key `parts_to_order`, display_order = celui de `parts_ordered`, décalage des suivants) pour chaque shop sans cette clé ; mise à jour de `add_default_sav_statuses_to_new_shop`.
- `SAVStatusesManager.tsx` : bloquer la suppression/renommage de clé pour les clés système (`pending`, `parts_to_order`, `parts_ordered`, `parts_received`, `ready`…) utilisées par le code.
