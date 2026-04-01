

## Plan : Journal d'audit (Log) pour chaque dossier SAV

### Objectif

Ajouter un bouton "Log" rouge visible uniquement par les profils `admin` (et `super_admin`) sur la page SAV. Ce bouton ouvre une page dédiée affichant l'historique complet de toutes les modifications du dossier : changements de pièces, modifications client, changements de statut, modifications de montants, etc. Chaque entrée indique les valeurs avant/après, l'horodatage et le nom de l'utilisateur.

### Architecture

1. **Nouvelle table `sav_audit_logs`** pour stocker chaque modification
2. **Trigger SQL** sur `sav_cases` et `sav_parts` pour capturer automatiquement les changements
3. **Nouvelle page** `/sav/:id/logs` pour afficher le journal
4. **Bouton "Log"** rouge dans le header SAV, conditionné au rôle admin

### Etape 1 : Migration SQL

Créer la table `sav_audit_logs` :

```sql
CREATE TABLE public.sav_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sav_case_id uuid REFERENCES public.sav_cases(id) ON DELETE CASCADE NOT NULL,
  shop_id uuid NOT NULL,
  action text NOT NULL,           -- 'update', 'insert', 'delete'
  table_name text NOT NULL,       -- 'sav_cases', 'sav_parts', etc.
  field_name text,                -- champ modifié
  old_value text,                 -- ancienne valeur
  new_value text,                 -- nouvelle valeur
  changed_by_user_id uuid,
  changed_by_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sav_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view their logs"
  ON public.sav_audit_logs FOR SELECT TO authenticated
  USING (shop_id = public.get_current_user_shop_id());

CREATE INDEX idx_sav_audit_logs_case ON public.sav_audit_logs(sav_case_id);
CREATE INDEX idx_sav_audit_logs_created ON public.sav_audit_logs(created_at DESC);
```

### Etape 2 : Logging applicatif (pas de trigger SQL)

Plutot que des triggers SQL (qui n'ont pas accès au nom de l'utilisateur connecté), le logging sera fait **côté applicatif** dans les hooks existants.

**Fichier : `src/hooks/useSAVAuditLog.ts`** (nouveau)

- Expose une fonction `logSAVChange(savCaseId, shopId, tableName, fieldName, oldValue, newValue, userName)`
- Insert dans `sav_audit_logs`

**Modifications dans les hooks/composants existants :**

- `useSAVCases.ts` : dans `updateCaseStatus`, `updateTechnicianComments`, `updatePrivateComments` -> appeler `logSAVChange`
- `SAVDetail.tsx` : lors de la sauvegarde du type SAV -> log
- `SAVPartsEditor.tsx` : lors d'ajout/suppression/modification de pièces -> log
- `EditSAVCustomerDialog.tsx` : lors de modification du client -> log
- `EditSAVDetailsDialog.tsx` : lors de modification des détails appareil -> log

### Etape 3 : Page de logs

**Fichier : `src/pages/SAVLogs.tsx`** (nouveau)

- Récupère les logs depuis `sav_audit_logs` filtrés par `sav_case_id`
- Affiche une timeline chronologique inversée (plus récent en haut)
- Chaque entrée montre : date/heure, nom utilisateur, champ modifié, ancien -> nouveau
- Formatage lisible des noms de champs (device_model -> "Modèle appareil", etc.)

### Etape 4 : Route et bouton

**Fichier : `src/App.tsx`**
- Ajouter route `/sav/:id/logs` -> `SAVLogs`

**Fichier : `src/pages/SAVDetail.tsx`**
- Ajouter bouton "Log" rouge (icône FileText ou ScrollText) dans la rangée d'actions
- Conditionné à `profile?.role === 'admin' || actualProfile?.role === 'super_admin'`
- `onClick` -> `navigate(\`/sav/${id}/logs\`)`

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| Migration SQL | Nouvelle table `sav_audit_logs` |
| `src/hooks/useSAVAuditLog.ts` | Nouveau hook utilitaire |
| `src/pages/SAVLogs.tsx` | Nouvelle page |
| `src/App.tsx` | Nouvelle route |
| `src/pages/SAVDetail.tsx` | Bouton "Log" conditionnel |
| `src/hooks/useSAVCases.ts` | Appels de logging |
| `src/components/sav/EditSAVDetailsDialog.tsx` | Appels de logging |
| `src/components/sav/EditSAVCustomerDialog.tsx` | Appels de logging |
| `src/components/sav/SAVPartsEditor.tsx` | Appels de logging |

