# Pastilles famille invisibles : correction

## Cause constatée
Les pastilles ne s'affichent que si le magasin possède des familles. Or les 5 familles par défaut n'étaient créées qu'à la première ouverture de Paramètres → Familles de produits. En base, seul Easycash Agde en a (créées à 17:05, juste avant votre message, à l'ouverture de cet écran). Tous les autres magasins n'en ont aucune, donc rien n'apparaît ni à la création du SAV ni sur la page SAV.

## Correction
1. Créer dès maintenant les 5 familles par défaut (Téléphones, Tablettes, Informatique, Consoles, Autres) pour chaque magasin qui n'en a pas.
2. Les créer automatiquement pour tout nouveau magasin à l'inscription (comme les types et statuts SAV par défaut).
3. Rafraîchir la liste des familles à chaque ouverture de la page SAV et du formulaire, pour qu'une famille ajoutée dans les paramètres apparaisse sans recharger.
4. Vérifier en étant connecté : pastilles visibles entre Marque et Modèle (formulaire classique et assistant simplifié), rangée de filtres sous les filtres de la page SAV.

Rien d'autre n'est modifié dans l'affichage.

## Détails techniques
- Migration : insert des familles par défaut pour les shops sans ligne dans `product_families` ; fonction + trigger AFTER INSERT sur `shops` (pattern `add_default_sav_types_to_new_shop`).
- `useProductFamilies` : `refetchOnMount: true` ; le seed côté client reste en filet de sécurité.
