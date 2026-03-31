

## Plan : comprendre et corriger les profils "fantômes" sans nom

### Diagnostic

La boutique "Easycash Agde" contient bien 4 profils distincts (4 `user_id` différents) :

| Profil | Nom | Role | Créé le |
|--------|-----|------|---------|
| Tristan C | admin | 2025-07-29 |
| fifi fifi | technician | 2025-07-30 |
| *(vide)* | technician | 2026-01-29 |
| *(vide)* | admin | 2026-03-25 |

Les 2 profils sans nom ne sont pas des "doublons" de Tristan ou fifi. Ce sont des comptes utilisateurs séparés qui ont été créés via le système d'invitation (`admin-user-management` Edge Function) ou via le trigger `handle_new_user` lors d'une inscription, sans que les noms aient été renseignés.

Ce sont probablement des comptes de test ou des invitations inachevées. Ils correspondent à de vrais comptes auth Supabase.

### Correction proposée

#### 1. Nettoyer les profils orphelins via migration SQL
Supprimer les 2 profils sans nom de cette boutique, car ils n'ont aucune utilité et polluent l'interface. Si les comptes auth correspondants existent, ils seront aussi nettoyés via l'Edge Function `admin-user-management`.

#### 2. Améliorer la robustesse de l'affichage dans Settings.tsx
Dans la section "Gestion des Utilisateurs", afficher clairement quand un profil n'a pas de nom (ex: "Utilisateur sans nom") au lieu d'afficher une carte vide, pour que ce cas soit visible et identifiable à l'avenir.

#### 3. Ajouter une validation au système d'invitation
Dans la logique d'invitation (Settings.tsx), vérifier que `first_name` et `last_name` sont obligatoires avant de créer un profil, pour éviter de recréer des profils fantômes.

### Fichiers concernés
- Migration SQL : supprimer les 2 profils vides
- `src/pages/Settings.tsx` : affichage fallback pour les noms vides + validation obligatoire des noms à l'invitation

