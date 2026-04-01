

## Plan : Afficher la date de cloture sur les cards SAV finalisees

### Objectif
Quand un dossier SAV a un statut final, afficher la date de cloture a cote de la date de creation dans la ligne metadonnees de la card.

### Source de donnees
Le champ `closure_history` (JSONB array) est deja present dans l'interface `SAVCase` et contient les entrees de cloture avec `closed_at`. On prend la derniere entree du tableau pour obtenir la date de cloture la plus recente. En fallback, si `closure_history` est vide, on utilise `updated_at`.

### Modification

**Fichier** : `src/pages/SAVList.tsx`

Dans la section "Ligne 3 : Metadonnees" (lignes 628-650), apres le badge de date de creation, ajouter conditionnellement un badge de date de cloture :

- Condition : `isFinalStatus(savCase.status)` (importer `isFinalStatus` depuis le hook existant)
- Badge : icone check-circle + date formatee `dd/MM/yyyy HH:mm`
- Style : `bg-green-100 text-green-700 border-green-200` pour indiquer visuellement la cloture
- Date source : derniere entree de `savCase.closure_history` ou fallback `savCase.updated_at`

Meme logique appliquee dans la vue compacte si elle affiche la date de creation.

### Rendu attendu

```text
📅 15/03/2026 14:30   ✅ Cloturé le 18/03/2026 10:15   ⏱ ...
```

### Fichier impacte
- `src/pages/SAVList.tsx` — ajout d'un badge conditionnel (environ 10 lignes)

