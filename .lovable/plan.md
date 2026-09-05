# Mises à jour automatiques + correction de la connexion Google

## 1. Connexion avec Google : ce que montre la vérification

Le fournisseur Google est bien actif côté serveur : le lien de connexion redirige correctement vers Google (test effectué à l'instant). Ce n'est donc pas une désactivation liée au mode bêta.

Le point suspect est le retour : le bouton renvoie toujours vers une seule adresse figée (`sav-pro-fix.lovable.app/dashboard`), quel que soit le site utilisé (fixway.fr, logicielsav.com, aperçu). Si l'adresse de retour n'est pas autorisée dans la configuration d'authentification, le retour tombe sur une page introuvable.

Correction prévue :
- Le retour se fait sur le site depuis lequel on s'est connecté (fixway.fr, logicielsav.com, aperçu, sav-pro-fix), plus d'adresse figée.
- Une page de retour dédiée finalise la connexion puis envoie vers le tableau de bord (ou vers l'accueil simplifié selon le rôle), avec un message clair si la connexion échoue au lieu d'une page blanche/404.
- Vérification et complément de la liste des adresses de retour autorisées côté authentification (fixway.fr, logicielsav.com, aperçu).
- Si après cette correction l'écran Google ne s'affiche toujours pas, la cause restante est la liste des URI autorisées dans la console Google : je vous indiquerai la ligne exacte à ajouter.

## 2. Notification et popup « Nouveautés » à chaque mise en ligne

- L'application vérifie régulièrement (toutes les 2 minutes et à chaque retour sur l'onglet) si une nouvelle version est en ligne.
- Quand c'est le cas : une belle popup s'affiche pour tous les utilisateurs connectés, annonçant la nouvelle version, avec un bouton « Recharger maintenant » et une option « Plus tard ».
- Rechargement forcé si l'utilisateur ne fait rien pendant un moment ou dès qu'il change de page, pour éviter qu'il reste sur une ancienne version (aucune perte de saisie en cours : le rechargement attend une page sans formulaire ouvert).
- Une pastille discrète dans l'en-tête rappelle qu'une mise à jour est disponible tant qu'elle n'est pas appliquée.
- La popup reste générique (« nouvelle version disponible ») comme demandé ; l'ajout d'un descriptif détaillé rédigé depuis le Super Admin pourra se greffer plus tard sans rien refaire.

## Détails techniques

- `src/pages/Auth.tsx` : `signInWithOAuth` avec `redirectTo: ${window.location.origin}/auth/callback`.
- Nouvelle page `src/pages/AuthCallback.tsx` + route publique `/auth/callback` dans `src/App.tsx` : lit la session (`detectSessionInUrl` est déjà activé), redirige vers `/dashboard` ou `/sav` en vue simplifiée, affiche l'erreur `error_description` le cas échéant.
- Mise à jour des Redirect URLs Supabase Auth (dashboard) : `https://fixway.fr/**`, `https://logicielsav.com/**`, `https://sav-pro-fix.lovable.app/**`, aperçu Lovable.
- Détection de version : `vite.config.ts` injecte `__APP_BUILD_ID__` (timestamp du build) ; un fichier `public/version.json` généré au build sert de référence distante. Nouveau hook `src/hooks/useAppVersion.ts` : `fetch('/version.json', { cache: 'no-store' })` en polling (120 s) + sur `visibilitychange`, comparaison avec l'id compilé.
- Nouveau composant `src/components/layout/UpdateAvailableDialog.tsx` monté dans `AppLayout` : dialog stylé (tokens du design system), boutons Recharger / Plus tard, `window.location.reload()` ; rechargement automatique lors d'un changement de route si l'utilisateur a différé.
- Aucune modification de base de données.
