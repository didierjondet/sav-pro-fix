# Connexion Google : supprimer le passage par Lovable

## Ce que montrent vos 2 écrans
1. **Écran Google :** il affiche l'adresse technique du service de connexion (`jljkrthymaqxkebosqko.supabase.co`) au lieu de « Fixway ». C'est un réglage de la console Google, pas du site.
2. **Écran Lovable :** après Google, le service de connexion vous a renvoyé vers une adresse d'**aperçu Lovable** (`lovable.dev/auth-bridge?project_id=...`). C'est une page privée, d'où la demande de connexion Lovable. Le site Fixway n'est même pas chargé à ce moment-là : aucune correction dans le code du site ne peut intercepter ce retour.

Cause la plus probable (non confirmable d'ici, je n'ai pas accès à vos réglages Supabase) : dans Supabase, l'**adresse du site par défaut** pointe vers l'aperçu Lovable, et/ou `https://fixway.fr` n'est pas dans la liste des adresses autorisées. Quand l'adresse demandée (fixway.fr/auth/callback) n'est pas autorisée, Supabase renvoie vers l'adresse par défaut, donc vers Lovable.

Constaté : quand on lance Google, le site demande bien un retour vers `https://fixway.fr/auth/callback`, et cette page répond correctement sur fixway.fr.

## Étape 1 — À faire par vous dans Supabase (5 minutes, indispensable)
Authentication → URL Configuration :
- **Site URL** : remplacer la valeur actuelle par `https://fixway.fr`
- **Redirect URLs**, ajouter :
  - `https://fixway.fr/**`
  - `https://www.fixway.fr/**`
  - `https://logicielsav.com/**`
  - `https://www.logicielsav.com/**`
- Supprimer de cette liste toute adresse contenant `lovable.dev`, `lovableproject.com` ou `id-preview--`.
- Enregistrer.

## Étape 2 — Console Google (pour que l'écran Google affiche « Fixway »)
Google Cloud → API et services → Écran de consentement OAuth (Branding) :
- Nom de l'application : **Fixway**, logo Fixway, adresse e-mail d'assistance.
- Domaines autorisés : `fixway.fr`, `logicielsav.com`, `supabase.co`.
- Liens vers votre page d'accueil et vos règles de confidentialité sur fixway.fr.
- Publier l'application (passer de « Test » à « En production ») et demander la validation de la marque. Tant que Google n'a pas validé, il peut continuer d'afficher l'adresse technique.
- Pour ne plus jamais voir `supabase.co` : domaine personnalisé Supabase (ex. `auth.fixway.fr`, option payante chez Supabase). Facultatif.

## Étape 3 — Ce que je fais ensuite côté site
- Publier la version actuelle : tous les retours de connexion et tous les e-mails vont vers fixway.fr.
- Bouton Google masqué dans l'aperçu Lovable (avec un message « Testez la connexion Google sur fixway.fr »), pour qu'aucun test ne parte plus de l'aperçu.
- Après vos réglages, test du lien Google lancé depuis fixway.fr pour vérifier que le service de connexion accepte bien le retour vers fixway.fr.

## Étape 4 — Votre test de validation
Sur **fixway.fr** (pas dans l'aperçu), en navigation privée : Connexion puis « Continuer avec Google » avec un compte inconnu. Résultat attendu : retour sur fixway.fr, puis écran de création du magasin.

## Détails techniques
- `Auth.tsx` et `ParticulierAuthPanel.tsx` : si `window.location.hostname` correspond à `lovable.app`, `lovableproject.com` ou `lovable.dev`, le bouton Google est remplacé par un lien vers `https://fixway.fr/auth`.
- Aucun changement de base de données. La configuration Supabase (projet externe) ne se modifie que depuis son tableau de bord.
