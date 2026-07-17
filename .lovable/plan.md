# Rattachement automatique du fournisseur sur les pièces

## Constat

Sur les cartes de pièces, le petit texte fournisseur visible (ex. `utopya`, `MOBILAX`) provient de l'ancien champ libre `parts.supplier`. Depuis l'ajout de l'annuaire fournisseurs (`parts.supplier_id` → `suppliers.id`), ce champ libre n'est plus rattaché automatiquement. Résultat : le détail de la pièce affiche un sélecteur fournisseur vide, alors que le nom est écrit sur la carte.

Requête sur la base : **288 pièces** ont un texte fournisseur mais aucun `supplier_id`. Les cas dominants :

| Texte sur carte | Occurrences | Fournisseur cible |
|---|---|---|
| `utopya` / `UTOPYA` / `Utopya` / `(UTOPYA)` / `UTOPI` | 237 | `UTOPYA` |
| `MOBILAX` / `mobilax ` / `mobilaxe` | 41 | `MOBILAX` |
| `amazon` | 7 | `AMAZON` |
| `easycash` | 7 | `EASYCASH AGDE` |
| autres (`CLIENT`, `G.G`, `TOUT_pour_phone`, `Phone réparation (slim)`) | 4 | pas de match → laissés tels quels |

Deux shops sont concernés ; chacun a son propre `UTOPYA` en base, donc le rattachement doit se faire **shop par shop**.

## Ce que je vais faire

Une seule opération data (via l'outil `supabase--insert`, aucune modification de schéma ni de code) : un `UPDATE parts` qui, pour chaque pièce ayant `supplier_id IS NULL` et un texte `supplier` non vide, tente de matcher un fournisseur du même shop via un nom **normalisé** :

- trim des espaces
- retrait des parenthèses/ponctuation autour (`(UTOPYA)` → `UTOPYA`)
- comparaison insensible à la casse et aux accents
- match sur le nom du fournisseur **ou** sur un alias explicite pour couvrir les fautes de frappe fréquentes :
  - `UTOPYA` ← `utopya`, `Utopya`, `UTOPI`, `(UTOPYA)`
  - `MOBILAX` ← `mobilax`, `mobilaxe`
  - `AMAZON` ← `amazon`
  - `EASYCASH AGDE` ← `easycash`

Toutes les autres pièces (texte non reconnu comme `CLIENT`, `G.G`, `TOUT_pour_phone`, `Phone réparation (slim)`) restent inchangées : je ne devine pas de fournisseur qui n'existe pas dans l'annuaire.

Le champ texte `parts.supplier` est **conservé** pour l'affichage sur la carte — on ne fait qu'ajouter le lien `supplier_id`.

## Portée volontairement limitée

- Pas de changement UI, pas de changement de hook, pas de migration de schéma.
- Pas de suppression du champ texte `supplier`.
- Pas de règle d'auto-rattachement à la création : l'objet de la demande est de nettoyer l'existant. Si tu veux qu'on l'applique aussi automatiquement sur les futures pièces (création manuelle et imports), dis-le et je le fais dans un second temps.

## Vérification

Avant/après je te donne le nombre de pièces mises à jour par fournisseur (attendu : ~237 UTOPYA, ~41 MOBILAX, 7 AMAZON, 7 EASYCASH).
