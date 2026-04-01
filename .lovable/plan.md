

## Plan : corriger le nom du technicien dans le document de restitution

### Diagnostic

Le problème est un **décalage de nom de champ** entre l'écriture et la lecture de l'historique de clôture :

- **Écriture** (`useSAVCases.ts` ligne 195) : le nom est enregistré sous `closed_by_name`
- **Lecture** (`pdfGenerator.ts` lignes 347, 784) : le PDF lit `closed_by`

Résultat : `entry.closed_by` est toujours `undefined`, d'où l'absence du nom.

### Correction

**Fichier : `src/utils/pdfGenerator.ts`**

Modifier la définition du type et les accès pour utiliser `closed_by_name` au lieu de `closed_by` :

1. Ligne 347 : changer `closed_by: string` → `closed_by_name: string`
2. Ligne 784 : changer `entry.closed_by` → `entry.closed_by_name`

C'est une correction de 2 lignes, aucun autre fichier impacté.

