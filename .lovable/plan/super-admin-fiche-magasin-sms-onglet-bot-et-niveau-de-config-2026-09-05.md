# Super Admin – Fiche magasin : SMS, onglet Bot et niveau de configuration

## 1. Corriger l'incohérence des SMS (vérifié)

Pour le magasin R-pare-phone80, la base indique : `monthly_sms_used = 1`, `sms_credits_used = 0`, quota mensuel 5.
Le magasin a donc bien consommé 1 SMS ; l'onglet « Crédits SMS » (4/5 restants) est juste.

Cause : la vue d'ensemble affiche l'ancien compteur `sms_credits_used`, qui n'est plus jamais incrémenté à l'envoi (il reste figé à 0). L'onglet Crédits SMS, lui, lit le compteur réellement utilisé (`monthly_sms_used` + crédits achetés/ajoutés).

Correction : la carte « SMS Utilisés » de la vue d'ensemble utilisera exactement la même source que l'onglet Crédits SMS (consommé / total disponible, incluant crédits offerts et achetés). L'ancien compteur figé ne sera plus affiché nulle part dans l'espace Super Admin.

## 2. Nouvel onglet « Bot »

Ajout d'un onglet « Bot » dans la popup de gestion du magasin, listant l'historique des échanges de ce magasin avec l'assistant Fixway (le composant d'archivage des conversations existe déjà côté Super Admin et sera simplement filtré sur le magasin).

Cadre légal / périmètre : seuls les échanges concernant l'usage de Fixway Pro sont conservés et affichés (bugs, blocages, questions de fonctionnalités, de prix, d'abonnement). Chaque conversation affichera :
- date, utilisateur, statut (escaladée ou non),
- un thème détecté automatiquement (bug, fonctionnalité, prix/abonnement, prise en main),
- le détail des messages à l'ouverture.

Un bandeau rappellera que ces archives sont limitées à l'usage du logiciel, et les conversations sans rapport (contenu client/personnel) seront exclues de l'affichage.

## 3. Niveau de configuration (ex. 3/13 étapes)

- Dans la vue d'ensemble : une carte « Configuration » avec le score (ex. « 3/13 étapes ») et une barre de progression, plus la liste repliable des étapes restantes.
- Sur les cartes magasin de la liste : un petit indicateur « Config. 3/13 » coloré (rouge < 40 %, orange < 80 %, vert au-delà) pour repérer d'un coup d'œil les magasins mal configurés.

Le calcul reprend la checklist d'onboarding déjà utilisée côté magasin (profil, infos magasin, types/statuts SAV, stock, horaires, équipe, TVA, tutoriels…), afin que le score vu par le Super Admin soit identique à celui vu par le magasin.

## Détails techniques

- `src/components/admin/ShopManagementDialog.tsx` : carte SMS de l'onglet « overview » alimentée par le RPC `get_sms_credits_breakdown` (comme `SMSCreditsTab`) ; passage de la grille d'onglets à 9 colonnes ; nouveaux onglets `bot` et carte configuration.
- Onglet Bot : réutilisation de `BotConversationsViewer` avec `shopId`/`shopName` (déjà supporté), + filtrage/classification par mots-clés sur le contenu des messages.
- Nouveau hook `src/hooks/useShopConfigProgress.ts` : version paramétrable par `shopId` de la logique de `useOnboardingProgress` (extraction du calcul des étapes dans un module partagé pour éviter la duplication), utilisée par le dialogue et par `src/components/admin/dashboard/ShopsManagement.tsx` (requête groupée pour les cartes).
- Aucune modification de schéma : `sms_credits_used` est laissé en base pour compatibilité, simplement plus affiché.
