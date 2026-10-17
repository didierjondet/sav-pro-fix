# Pastilles « famille de produit » sur les SAV

## Objectif
Chaque SAV porte une pastille de famille de produit (ex : Téléphones, Consoles, Informatique…). L'IA la propose automatiquement dès que la marque et le modèle sont saisis ; on peut la changer. Sur la page SAV, une rangée de pastilles sous les filtres actuels permet de filtrer par famille en plus des autres filtres.

## 1. Paramètres : familles configurables
- Nouvel écran « Familles de produits » (catégorie Paramètres SAV) : nom, couleur, icône facultative, ordre, archivage (comme les types de SAV, pour garder l'historique).
- À la première ouverture, 5 familles proposées par défaut : Téléphones, Tablettes, Informatique, Consoles, Autres — modifiables.
- Chaque magasin a ses propres familles.

## 2. Création du SAV (ordinateur, assistant simplifié, saisie via smartphone)
- Entre « Marque » et « Modèle » : rangée de pastilles cliquables.
- Dès que marque + modèle sont remplis : présélection instantanée par la règle locale existante (déjà utilisée par les statistiques), puis confirmation par l'IA si la règle hésite (« Autres ») en tenant compte des familles du magasin. Petit libellé « Proposé par l'IA ».
- Si l'utilisateur choisit lui-même une pastille, l'IA ne la remplace plus.
- Les données venant du smartphone pré-sélectionnent aussi la pastille sur l'ordinateur.

## 3. Fiche SAV et cartes
- Pastille visible sur la carte SAV de la liste et dans l'en-tête du dossier, modifiable depuis le dossier (enregistrement automatique).

## 4. Page SAV : filtre par pastille
- Sous les filtres traditionnels : rangée « Toutes » + une pastille par famille avec compteur.
- Sélection multiple possible ; se combine avec statut, type, recherche, etc. ; mémorisée comme les autres filtres (remise à zéro quotidienne). Pastille active surlignée en orange (règle existante).

## 5. Anciens SAV
- Bouton dans les paramètres « Classer les SAV existants » : classe automatiquement les dossiers sans famille (règle locale puis IA par lots). Rien n'est modifié sans ce clic.

## Détails techniques
- Migration : table `product_families` (shop_id, name, color, icon, display_order, is_active, timestamps) avec GRANT + RLS par magasin ; colonne `sav_cases.product_family_id` (FK, on delete set null) + index.
- Hook `useProductFamilies` (pattern de `usePartCategories`), manager dans Paramètres.
- Suggestion : `categorizeDevice` de `src/lib/deviceCategorization.ts` mappé par nom sur les familles du magasin ; repli IA via une évolution de `classify-sav-category` acceptant la liste des familles du magasin (réponse = id), appel debouncé.
- Composant partagé `ProductFamilyChips` utilisé dans SAVForm, SAVWizardDialog, SAVDetail, SAVList.
- Filtre ajouté au state persistant de SAVList (`familyIds`), appliqué côté requête.
- Test unitaire du mapping règle locale → famille (ex : « APPLE / IPHONE 13 » → Téléphones, « SONY / PS5 » → Consoles).
- Statistiques existantes inchangées.
