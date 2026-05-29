# Masquer la « clé du type » lors de la création d'un type SAV

## Objectif
Aligner la création des types SAV sur le comportement des statuts : l'utilisateur ne saisit que le **Libellé**, la clé technique (`type_key`) est générée automatiquement et de manière transparente côté code.

## Fichier modifié
`src/components/sav/SAVTypesManager.tsx` uniquement (aucun changement BDD, aucun autre composant impacté).

## Changements

### 1. Slugification automatique du libellé
Ajouter un helper local :
```ts
const slugifyLabel = (label: string) =>
  label.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // retire accents
    .replace(/[^a-z0-9]+/g, '_')                         // non alphanum -> _
    .replace(/^_+|_+$/g, '')                             // trim _
    .slice(0, 50);
```

### 2. Création (`handleCreate`)
- Calculer `type_key = slugifyLabel(formData.type_label)` au moment de l'insert.
- En cas de collision possible (même libellé deux fois), suffixer par un compteur basé sur les `types` existants : `reparation_ecran`, `reparation_ecran_2`, etc.
- Garder un garde-fou : si `type_label` vide → toast d'erreur "Le libellé est requis".

### 3. Édition (`handleEdit`)
- Ne plus permettre de modifier la clé. La clé reste celle existante (`editingType.type_key`) → préserve toute la cohérence avec les SAV déjà créés.
- Pour les types par défaut : aucun changement (clé déjà figée).

### 4. UI du dialog (lignes ~293-309)
- Supprimer entièrement le champ « Clé du type » et son texte d'aide.
- Le champ « Libellé » devient le premier champ du formulaire.

### 5. Affichage de la liste (ligne ~561)
- Retirer la mention `Clé: {type.type_key}` du rendu liste (information technique inutile pour l'utilisateur). Le libellé et la couleur suffisent.

## Hors-scope
- Aucune migration BDD : la colonne `type_key` reste indispensable (utilisée partout dans les hooks, rapports, widgets, filtres).
- Aucun changement sur `SAVStatusesManager`, déjà conforme à ce modèle.
- Aucun renommage rétroactif des clés existantes.

## Validation
1. Créer un type "Réparation écran" → enregistré avec `type_key = reparation_ecran`, visible en liste sans afficher la clé.
2. Créer un second type "Réparation écran" → `type_key = reparation_ecran_2` (pas d'erreur d'unicité).
3. Modifier un type existant → la clé reste inchangée, seul le libellé/couleur/options sont éditables.
4. Les SAV existants liés à un type continuent de fonctionner (rapports, widgets, statistiques inchangés).
