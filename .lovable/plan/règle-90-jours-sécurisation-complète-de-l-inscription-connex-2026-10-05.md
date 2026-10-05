# Règle 90 jours + sécurisation complète de l'inscription / connexion

## 1. Appliquer la règle des 90 jours
- Enregistrer 90 jours en base pour la règle « suppression des magasins inactifs » (la valeur reste modifiable dans le Super Admin).
- Contrôle après coup : la carte Super Admin affiche bien 90.

## 2. Comprendre ce qui s'est passé avec Google (à vérifier en premier)
Cause pas encore confirmée. Deux pistes, à vérifier avant de corriger :
- **Adresse de retour refusée :** si l'adresse de retour (fixway.fr, logicielsav.com, aperçu…) n'est pas dans la liste autorisée du service de connexion, celui-ci renvoie vers l'« adresse du site » par défaut. Si cette adresse par défaut pointe vers un domaine Lovable, la personne arrive sur Lovable et s'y inscrit.
- **Test fait depuis l'aperçu :** l'aperçu est hébergé chez Lovable, donc le retour peut tomber sur Lovable.
Vérification : lecture des journaux de connexion de cet après-midi (origine, adresse de retour) et test du lien Google depuis fixway.fr.

## 3. Corrections prévues
- **Une seule adresse de retour, toujours sur votre domaine :** tous les boutons Google (magasins, particuliers) et tous les e-mails (confirmation, mot de passe oublié, invitation) renvoient vers `https://fixway.fr/...`, jamais vers une adresse Lovable, même si l'action démarre depuis l'aperçu ou un autre domaine.
- **Page de retour protégée :** finalise la connexion, puis envoie au bon endroit (tableau de bord, accueil simplifié, ou « Mon espace » pour un particulier). En cas d'échec : message clair en français et bouton de retour, jamais de page Lovable ni de page blanche.
- **Compte Google inconnu :** un nouveau compte magasin arrive sur l'écran de création de magasin. Un nouveau compte particulier arrive dans « Mon espace ». Pas d'accès au tableau de bord sans magasin.
- **Plus aucune mention de Lovable visible :** vérification du titre, des métadonnées de partage, du favicon, des textes et des liens dans les e-mails et les SMS. On remplace toutes les mentions par Fixway.
- **Réglages côté service de connexion (dashboard Supabase, je vous donne les lignes exactes) :**
  - Adresse du site = `https://fixway.fr`
  - Adresses autorisées = `https://fixway.fr/**`, `https://logicielsav.com/**`, `https://sav-pro-fix.lovable.app/**`
  - Console Google : nom de l'application « Fixway », logo, domaines autorisés fixway.fr. Ainsi, l'écran Google affiche Fixway.
  - Option : domaine personnalisé pour le service de connexion (ex. `auth.fixway.fr`), pour que l'écran Google n'affiche plus l'adresse technique.

## 4. Vérification complète du parcours
Tests prévus : inscription magasin par e-mail, connexion magasin, Google avec un compte inconnu (magasin et particulier), mot de passe oublié, confirmation d'e-mail et invitation d'un membre. Pour chaque parcours, on contrôle l'adresse finale et l'absence de Lovable. Les tests avec un vrai compte ne sont possibles que sur le site en ligne. Je vous fournirai une liste de contrôle courte.

## Détails techniques
- Données : `UPDATE system_alerts SET threshold_value = 90 WHERE alert_type = 'inactive_shop_cleanup'`.
- Nouveau helper `src/lib/authRedirect.ts` (`AUTH_BASE_URL = 'https://fixway.fr'`). Il est utilisé dans `Auth.tsx`, `ParticulierAuthPanel.tsx`, `AuthContext.tsx` (signUp), `ResetPassword`, `ProfileSetup` et les fonctions d'invitation (`send-invitation`, `admin-user-management`).
- `AuthCallback.tsx` : paramètre `next` en liste blanche (chemins internes uniquement), routage par type de compte (profil magasin ou `buyback_customers`).
- Analyse des journaux d'authentification, puis recherche `rg -i lovable` dans `src/`, `index.html`, `public/` et `supabase/functions/`.
- `supabase/config.toml` : `site_url` / `additional_redirect_urls` mis à jour pour la cohérence (la configuration réelle reste dans le dashboard du projet externe).
