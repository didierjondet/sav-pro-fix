# Connexion Google : 404 uniquement dans l'éditeur Lovable

## Diagnostic confirmé

- En production (fixway.fr / sav-pro-fix.lovable.app), la connexion Google fonctionne : rien à craindre en publiant, le correctif précédent n'a pas cassé la production.
- Dans l'éditeur Lovable, la prévisualisation tourne sous le domaine `lovable.dev`. L'adresse de retour envoyée à Google est calculée avec l'adresse du site en cours (`window.location.origin`) : elle devient donc `https://lovable.dev/...`, une page qui n'existe pas chez Lovable → **404 Lovable** (et non une 404 de votre application).
- Ce n'est ni le mode bêta, ni Google, ni Supabase : c'est uniquement le contexte « éditeur Lovable ».

## Correction prévue

1. **Adresse de retour intelligente dans `src/pages/Auth.tsx`** (bouton « Continuer avec Google ») :
   - Si l'application tourne dans l'éditeur Lovable (domaine `lovable.dev`), le retour se fait vers l'adresse de production `https://sav-pro-fix.lovable.app/auth/callback` — comportement identique à l'ancienne version qui fonctionnait : vous êtes redirigé vers le site publié, connecté.
   - Sinon (fixway.fr, logicielsav.com, sav-pro-fix.lovable.app, aperçu direct), on garde l'adresse du site en cours, comme actuellement.
2. **Aucun changement côté production** : le comportement sur fixway.fr reste strictement identique.
3. **Aucun changement de base de données ni de configuration serveur.**

## Détails techniques

- Détection simple : `window.location.hostname.endsWith('lovable.dev')` → `redirectTo = 'https://sav-pro-fix.lovable.app/auth/callback'`, sinon `redirectTo = ${window.location.origin}/auth/callback`.
- Même logique appliquée au lien « mot de passe oublié » (`reset-password`) qui utilise le même calcul d'origine, pour éviter le même piège dans l'éditeur.
- Vérification après modification : build OK, puis test du flux dans l'aperçu (le clic doit partir vers Google puis revenir sur le site de production connecté).

## Limite connue

Dans l'éditeur Lovable, le retour de Google vous amènera sur le site de **production** (connecté), pas dans la prévisualisation — c'est une contrainte technique de Lovable (la prévisualisation n'a pas d'adresse publique stable autorisée pour le retour Google). Pour tester la connexion Google « dans l'éditeur », il faudra utiliser la connexion par email, ou tester Google directement sur fixway.fr.
