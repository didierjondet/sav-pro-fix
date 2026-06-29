## Objectif
Ajouter un mini-CRM par prospect dans `ProspectsManager` : pouvoir consigner plusieurs notes horodatées (date + heure + auteur) sur la fiche de chaque prospect, sans toucher au reste qui fonctionne déjà (statuts, filtres, badges, suppression, etc.).

## Changements

### 1. Base de données (migration)
Nouvelle table `public.prospect_notes` :
- `prospect_id` (FK vers `prospects.id`, ON DELETE CASCADE)
- `author_id` (uuid, l'admin qui écrit — `auth.uid()`)
- `author_name` (texte, snapshot pour l'affichage même si le profil change)
- `content` (texte, requis)
- `created_at`, `updated_at`

GRANTs + RLS : lecture/écriture/édition/suppression réservées aux `super_admin` (cohérent avec la lecture de `prospects` actuelle). Index sur `prospect_id`. Trigger `updated_at`.

### 2. UI — `src/components/admin/ProspectsManager.tsx`
Sur chaque card prospect, sous le bloc actions existant, ajout d'une section **Notes CRM** :
- Bouton compact « Notes (n) » qui ouvre/déploie une zone repliée par défaut (pas d'encombrement visuel pour les cards sans notes).
- Liste des notes existantes, triées par date décroissante : auteur, date + heure formatées en français (`dd/MM/yyyy HH:mm`), contenu (whitespace-pre-wrap).
- Chaque note : bouton éditer / supprimer (si auteur courant ou super_admin).
- Champ `Textarea` + bouton « Ajouter » en bas pour créer une nouvelle note (date/heure auto = `now()`).

Aucun changement aux autres parties du composant (counters, filtres, statuts, badges intérêts, dialog de suppression).

### 3. Hook léger
Ajout d'un petit hook local dans le composant (pas de nouveau fichier) ou helpers inline : `fetchNotes(prospectId)`, `addNote`, `updateNote`, `deleteNote`. Compteur de notes par prospect chargé en une seule requête groupée au montage pour afficher « Notes (n) » sans ouvrir.

## Détails techniques
- Format date : `Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })`.
- `author_name` rempli côté client à partir de `profiles` (first_name + last_name) ou fallback email.
- Realtime non nécessaire (usage admin ponctuel) — refetch après mutation.
- Aucune modification du schéma `prospects` lui-même.

## Fichiers touchés
- **Migration nouvelle** : table `prospect_notes` + RLS + GRANTs + trigger.
- **Édité** : `src/components/admin/ProspectsManager.tsx` (ajout section Notes uniquement).
