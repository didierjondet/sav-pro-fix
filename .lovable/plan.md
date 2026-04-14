

## Plan : Historique des conversations HelpBot dans Super Admin (avec suppression)

### Objectif
Persister les conversations HelpBot en base, les afficher dans le Super Admin (section Support + cards magasins), et permettre au Super Admin de supprimer des conversations avec confirmation.

### 1. Migration SQL

Creer la table `help_bot_conversations` :
- `id`, `shop_id`, `user_id`, `user_name`, `messages` (JSONB), `created_at`, `updated_at`, `escalated`, `escalation_summary`
- RLS : Super Admin = ALL, shop users = leurs propres conversations
- Index sur `shop_id` et `created_at`

### 2. Persistance -- `useHelpBot.ts`

Modifier le hook pour sauvegarder chaque conversation (upsert) dans `help_bot_conversations` apres chaque echange. Marquer `escalated = true` si escalade confirmee.

### 3. Nouveau composant `BotConversationsViewer.tsx`

- Liste des conversations avec filtres (boutique, date, escalade)
- Affichage des messages en bulles (user/assistant) avec rendu markdown
- Mode filtre par `shop_id` (pour usage dans les cards magasins)
- **Suppression** : bouton supprimer sur chaque conversation, avec `AlertDialog` de confirmation ("Etes-vous sur de vouloir supprimer cette conversation ?")
- Suppression unitaire ou en lot (checkbox + bouton "Supprimer la selection")

### 4. Integration Super Admin

- **Section Support** (`SuperAdmin.tsx`) : ajouter un systeme d'onglets "Tickets" / "Conversations Bot"
- **Card Magasin** (`ShopManagementDialog.tsx`) : ajouter un onglet "Support" avec le viewer filtre par `shop_id`

### Fichiers concernes

| Fichier | Action |
|---------|--------|
| Migration SQL | Nouveau |
| `src/components/admin/BotConversationsViewer.tsx` | Nouveau |
| `src/hooks/useHelpBot.ts` | Modifie (persistance) |
| `src/pages/SuperAdmin.tsx` | Modifie (onglet dans support) |
| `src/components/admin/ShopManagementDialog.tsx` | Modifie (onglet Support) |
| `src/integrations/supabase/types.ts` | Auto-update |

### Detail suppression avec confirmation

Le composant utilisera `AlertDialog` (deja present dans le projet) pour demander confirmation avant chaque suppression. Un bouton "Supprimer tout" avec confirmation distincte sera aussi disponible pour vider l'historique d'une boutique ou globalement.

