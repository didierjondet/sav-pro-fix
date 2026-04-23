

## Plan : toggle Super Admin + redirection conditionnelle inscription → formulaire prospect

### Comportement cible

**Quand le toggle "Rediriger inscription vers formulaire prospect" est ACTIF (par défaut) :**
- Bouton "Connexion" du header landing → page `/auth` (onglet connexion) — accès magasins existants conservé.
- Bouton "Essai Gratuit" du header → ouvre le `ProspectDialog`.
- Tous les autres CTA "Essayer gratuitement" / Hero / Pricing / FinalCTA → ouvrent le `ProspectDialog`.
- Sur la page `/auth`, un clic sur l'onglet/lien "Inscription" → ouvre le `ProspectDialog` (au lieu de basculer sur le formulaire de signup).

**Quand le toggle est INACTIF :**
- Tous les boutons retrouvent leur comportement initial : redirection vers `/auth` (signup ou login selon le bouton).
- Aucun `ProspectDialog` ne s'ouvre.

### 1. Stockage du flag dans la BDD

Ajouter une ligne dans la table existante `app_settings` (ou équivalent) :
- Clé : `prospect_redirect_enabled`
- Valeur : `boolean` (défaut `true`)

Si aucune table de settings globale n'existe, créer `app_global_settings` (key text PK, value jsonb, updated_at) avec RLS :
- SELECT public (`true`) — pour que la landing puisse lire le flag sans auth.
- UPDATE/INSERT : `is_super_admin()` uniquement.

### 2. Hook partagé `useProspectRedirect`

Nouveau hook `src/hooks/useProspectRedirect.ts` :
- Récupère le flag depuis la BDD (avec cache React Query).
- Retourne `{ enabled: boolean, isLoading: boolean }`.
- Utilisé par la landing publique ET la page `/auth`.

### 3. Modifications landing publique

**`src/pages/PublicLanding.tsx`** :
- Récupère `enabled` via `useProspectRedirect`.
- Crée deux handlers distincts :
  - `handleLoginClick` → toujours `/auth` (passé au `LandingHeader` pour le bouton "Connexion").
  - `handleSignupClick` → si `enabled` ouvre `ProspectDialog`, sinon redirige `/auth`.
- Passe `handleSignupClick` au bouton "Essai Gratuit" du header, à `HeroSection`, `PricingSection`, `FinalCTA`.

**`src/components/landing/LandingHeader.tsx`** :
- Ajouter une prop `onLoginClick` (en plus de `onAuthClick` existant).
- Bouton "Connexion" → `onLoginClick`.
- Bouton "Essai Gratuit" → `onAuthClick` (qui devient le handler signup).
- Rétrocompatible : si `onLoginClick` non fourni, fallback sur `onAuthClick`.

**`src/pages/Landing.tsx`** : aucun changement (page interne, parcours utilisateur connecté).

### 4. Modification de la page `/auth`

**`src/pages/Auth.tsx`** :
- Récupérer `enabled` via `useProspectRedirect`.
- État local `prospectDialogOpen`.
- Sur le clic du bouton/onglet "Inscription" (ou "Créer un compte" / lien "Pas encore de compte ?") :
  - Si `enabled` → `setProspectDialogOpen(true)` (et empêcher la bascule vers le formulaire signup).
  - Sinon → comportement initial (afficher formulaire signup).
- Monter `<ProspectDialog>` en bas du JSX.

### 5. Toggle Super Admin

**Nouveau composant `src/components/admin/ProspectRedirectToggle.tsx`** :
- Card simple avec `<Switch>` + label + description.
- Lecture/écriture du flag dans la BDD via mutation React Query.
- Toast de confirmation.

**Intégration** : ajouter ce toggle en haut du composant `ProspectsManager.tsx` (déjà existant), pour regrouper la gestion prospect au même endroit. Pas besoin d'ajouter un nouvel item de menu.

### 6. Détails techniques

- Le flag est public-readable pour éviter un appel auth depuis la landing.
- Cache React Query sur `useProspectRedirect` avec `staleTime: 60_000` pour éviter les rerenders.
- Aucun impact sur `/auth` côté login : le formulaire de connexion fonctionne toujours, seul le basculement vers signup est intercepté.
- Le `ProspectDialog` existant est réutilisé tel quel.

### Fichiers créés / modifiés

**Migration BDD** : créer table `app_global_settings` (si absente) + insérer `prospect_redirect_enabled = true`.

**Créés** :
- `src/hooks/useProspectRedirect.ts`
- `src/components/admin/ProspectRedirectToggle.tsx`

**Modifiés** :
- `src/pages/PublicLanding.tsx` (deux handlers distincts)
- `src/components/landing/LandingHeader.tsx` (prop `onLoginClick`)
- `src/pages/Auth.tsx` (interception du clic "Inscription")
- `src/components/admin/ProspectsManager.tsx` (intégration du toggle en tête)

### Vérification

- Toggle ON (défaut) :
  - Landing → "Connexion" ouvre `/auth` (login fonctionne pour magasins existants).
  - Landing → "Essai Gratuit" ouvre le popup prospect.
  - `/auth` → clic sur "Inscription" ouvre le popup prospect.
- Toggle OFF :
  - Landing → "Connexion" et "Essai Gratuit" mènent tous deux à `/auth`.
  - `/auth` → "Inscription" affiche normalement le formulaire de création de compte.
- Bascule du toggle dans Super Admin → effet immédiat sur la landing (après refetch / nouveau chargement).

