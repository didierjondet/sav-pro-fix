

## Plan : blocage des inscriptions + popup prospect + menu Super Admin "Prospects"

### 1. Nouvelle table `prospects` (Supabase)

Création d'une table publique pour collecter les contacts depuis la landing page.

**Colonnes :**
- `id` (uuid, PK)
- `first_name` (text, requis)
- `last_name` (text, requis)
- `company_name` (text, requis)
- `email` (text, requis)
- `phone` (text, optionnel)
- `interested_in_beta` (boolean, défaut false) — souhaite être beta testeur
- `interested_in_recontact` (boolean, défaut false) — souhaite être rappelé à la sortie commerciale
- `interested_in_demo` (boolean, défaut false) — souhaite une démo
- `free_message` (text, optionnel) — champ libre
- `status` (text, défaut `'new'`) — `new`, `contacted`, `converted`, `archived` (pour suivi futur)
- `created_at`, `updated_at` (timestamps)

**RLS :**
- INSERT public anonyme (`true`) — pour permettre la soumission depuis la landing sans compte.
- SELECT/UPDATE/DELETE : `is_super_admin()` uniquement.

### 2. Popup prospect sur la landing page

**Nouveau composant `src/components/landing/ProspectDialog.tsx`** :
- Dialog modal déclenché par TOUS les boutons d'inscription/auth de la landing publique (`PublicLanding.tsx`).
- Message d'introduction expliquant que les inscriptions sont temporairement closes le temps du programme bêta, et qu'on peut les recontacter à la sortie commerciale ou organiser une démo.
- Formulaire avec validation Zod :
  - Prénom * / Nom * / Entreprise * / Email * / Téléphone (optionnel)
  - 3 cases à cocher : "Devenir beta testeur" / "Être recontacté à la sortie" / "Demander une démo"
  - Champ texte libre "Message ou besoin spécifique"
- Bouton "Envoyer ma demande" → insertion dans `prospects` → toast de confirmation → fermeture.

**Modification de `PublicLanding.tsx`** :
- Remplacer `handleAuthClick = () => window.location.href = '/auth'` par l'ouverture du `ProspectDialog`.
- État `prospectDialogOpen` géré localement.
- La page `/auth` reste accessible directement (pour les clients existants déjà inscrits) — seul le parcours d'inscription depuis la landing est bloqué.

**Note** : Le fichier `Landing.tsx` (variante interne, non publique) **n'est pas modifié** pour respecter l'isolation. Seule la landing publique `/` (PublicLanding.tsx) est concernée.

### 3. Nouveau menu Super Admin "Prospects"

**Ajout dans `SuperAdminSidebar.tsx`** :
- Nouveau groupe ou ajout dans groupe "Gestion" : item `{ id: 'prospects', title: 'Prospects', icon: UserPlus }`.

**Nouveau composant `src/components/admin/ProspectsManager.tsx`** :
- Liste des prospects sous forme de cartes (style cohérent avec les cards existantes du Super Admin).
- Chaque carte affiche :
  - Nom complet + nom de l'entreprise (titre)
  - Email + téléphone (avec liens `mailto:` / `tel:`)
  - Badges colorés selon les intérêts cochés : "Beta testeur" (vert), "Recontact" (bleu), "Démo" (violet)
  - Message libre (si rempli)
  - Date de création (relative : "il y a X jours")
  - Badge de statut (`new` / `contacted` / `converted` / `archived`)
- Filtres en tête : par statut, par intérêt (beta / recontact / démo), recherche texte (nom/entreprise/email).
- Actions par carte :
  - Bouton "Marquer comme contacté" → met à jour `status`
  - Bouton "Archiver"
  - Bouton "Supprimer" (avec confirmation)
- Compteur total + compteurs par statut en haut.

**Branchement dans `SuperAdmin.tsx`** :
- Import du nouveau composant.
- Ajout du `case 'prospects': return <ProspectsManager />;` dans `renderActiveSection()`.

### 4. Détails techniques

- **Validation** : Zod côté formulaire (email valide, longueurs max 255, au moins une case cochée OU un message libre rempli pour valider).
- **Pas d'edge function** nécessaire : l'insertion se fait directement via le client Supabase grâce à la policy INSERT publique.
- **Aucun impact** sur les autres parties du code (auth, SAV, agenda, wizard…).

### Fichiers créés / modifiés

- **Migration BDD** : nouvelle table `prospects` + RLS.
- **Créés** :
  - `src/components/landing/ProspectDialog.tsx`
  - `src/components/admin/ProspectsManager.tsx`
- **Modifiés** :
  - `src/pages/PublicLanding.tsx` (remplacement de `handleAuthClick`)
  - `src/components/admin/SuperAdminSidebar.tsx` (ajout entrée menu)
  - `src/pages/SuperAdmin.tsx` (ajout du case `'prospects'`)

### Vérification

- Cliquer sur "Essai Gratuit" / "Connexion" / "Essayer gratuitement" / CTA finale sur la landing publique → popup prospect s'ouvre (pas de redirection vers `/auth`).
- Remplir le formulaire (nom, entreprise, email, cocher "Beta testeur") → soumission → toast de confirmation → fermeture.
- Vérifier dans Super Admin → menu "Prospects" → la carte apparaît avec les bons badges.
- Tester les filtres et actions (marquer contacté, archiver, supprimer).
- Vérifier que `/auth` reste accessible directement (pour utilisateurs existants).

