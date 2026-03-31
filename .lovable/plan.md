

## Plan : Horodatage de clôture SAV immutable + affichage sur le bon de restitution

### Objectif

Quand un SAV passe sur un statut final (`is_final_status = true`), enregistrer automatiquement : la date/heure, le statut utilisé, et l'utilisateur qui a clôturé. Ces informations sont **immutables** et **cumulatives** (si le SAV est rouvert puis re-clôturé, on ajoute une nouvelle entrée sans effacer les précédentes). Elles apparaissent sur le document de restitution.

### 1. Migration SQL — ajouter une colonne `closure_history` sur `sav_cases`

Ajouter un champ JSONB `closure_history` à la table `sav_cases` qui stocke un tableau d'objets :

```json
[
  {
    "closed_at": "2026-03-31T22:30:00Z",
    "status": "ready",
    "status_label": "Prêt",
    "closed_by_user_id": "uuid...",
    "closed_by_name": "Tristan C"
  }
]
```

```sql
ALTER TABLE sav_cases ADD COLUMN closure_history jsonb DEFAULT '[]'::jsonb;
```

### 2. Modifier `useSAVCases.ts` — `updateCaseStatus`

Quand le nouveau statut correspond à un statut final :
- Récupérer le profil de l'utilisateur courant (nom + prénom)
- Récupérer le libellé du statut depuis `shop_sav_statuses`
- Lire le `closure_history` actuel du SAV
- Y ajouter une nouvelle entrée avec `closed_at`, `status`, `status_label`, `closed_by_user_id`, `closed_by_name`
- Sauvegarder le tout dans le champ `closure_history` en même temps que le changement de statut

Le code doit vérifier `is_final_status` en interrogeant `shop_sav_statuses` pour le statut cible.

### 3. Modifier `SAVPrint.tsx` — afficher les clôtures sur le bon de restitution

Ajouter un bloc "Historique de clôture" dans le HTML d'impression, après les notes de réparation :
- Pour chaque entrée de `closure_history`, afficher : date/heure formatée, statut utilisé, nom de la personne
- Style distinct (encadré, police légèrement différente)

### 4. Mettre à jour le type `SAVCase`

Dans `useSAVCases.ts`, ajouter au type `SAVCase` :

```typescript
closure_history?: Array<{
  closed_at: string;
  status: string;
  status_label: string;
  closed_by_user_id: string;
  closed_by_name: string;
}>;
```

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Ajout colonne `closure_history` |
| `src/hooks/useSAVCases.ts` | Type SAVCase + logique d'append dans `updateCaseStatus` |
| `src/components/sav/SAVPrint.tsx` | Bloc d'affichage de l'historique de clôture |

### Immutabilité

L'immutabilité est garantie côté applicatif : on ne fait que des **append** au tableau, jamais de suppression ou modification d'entrées existantes. Le champ `closure_history` n'est jamais écrasé, seulement étendu.

