## Onglet "Logs" dans Paramètres (admin uniquement)

### Objectif
Ajouter un onglet `Logs` dans `Paramètres`, visible seulement par les administrateurs, listant toutes les actions effectuées sur le logiciel, ligne par ligne, triées par date avec un filtre date unique ou intervalle.

### Approche

Plutôt que d'ajouter une nouvelle table générique (qui imposerait d'instrumenter tout le code), on **agrège les sources de logs déjà existantes** dans la base :

- `sav_audit_logs` — création / modification / clôture / changements de statut SAV, parts, pièces
- `inventory_audit_logs` — mouvements de stock
- `email_send_logs` — envois d'emails (clients, notifications)
- `login_history` (si présente côté shop) — connexions des membres

Toutes ces tables sont déjà filtrées par `shop_id`. On les unifie côté client dans un seul flux chronologique.

### Plan

1. **Onglet `logs` dans `src/pages/Settings.tsx`**
   - Ajouter `'logs'` dans la liste `availableTabs` conditionnée par `isAdmin` (même garde que `loaners`)
   - Ajouter `<TabsTrigger value="logs">` avec icône `ScrollText` et libellé « Logs »
   - Ajouter `<TabsContent value="logs">` qui rend `<LogsManager />`

2. **Composant `src/components/settings/logs/LogsManager.tsx`**
   - Hook `useActivityLogs({ from, to })` qui lance en parallèle les requêtes sur `sav_audit_logs`, `inventory_audit_logs`, `email_send_logs` filtrées par `shop_id` et `created_at` entre `from` et `to`
   - Normalisation : `{ id, timestamp, source, actor, action, target, details }`
   - Fusion + tri DESC par `timestamp`
   - Affichage : tableau (Date/heure · Utilisateur · Source · Action · Détail) avec pagination simple (50 par page) et badges colorés par `source`

3. **Filtre date**
   - Deux modes via `RadioGroup` ou un toggle :
     - **Date unique** : un `DatePicker` (shadcn), filtre `[date 00:00, date+1 00:00[`
     - **Intervalle** : deux `DatePicker` (du / au), bornés au jour près
   - Bouton « Réinitialiser » → 7 derniers jours par défaut
   - Bouton « Exporter CSV » (optionnel mais simple) reprenant le résultat filtré courant

4. **Sécurité**
   - L'onglet n'apparaît que si `isAdmin` (cohérent avec `loaners`)
   - Aucune nouvelle policy nécessaire : les RLS existantes sur les tables sources scopent déjà au `shop_id` et exigent un rôle admin sur `sav_audit_logs` / `inventory_audit_logs`

### Hors périmètre
- Pas de nouvelle table `activity_logs` générique
- Pas d'instrumentation de nouvelles actions (on liste ce qui est déjà journalisé)
- Pas de modifications visuelles ailleurs dans Settings

### Fichiers
- Modifié : `src/pages/Settings.tsx`
- Créés : `src/components/settings/logs/LogsManager.tsx`, `src/hooks/useActivityLogs.ts`