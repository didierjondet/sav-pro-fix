# Sécurité 2FA + compréhension de l'usage réel

## Constat mesuré (données actuelles)

- 46 comptes créés, 6 ne se sont jamais connectés, seulement 9 sont revenus après le premier jour, 9 actifs sur 30 jours.
- Sur 28 magasins, 2 seulement ont une activité réelle (Easycash Agde : 1345 SAV, Easy Cash Brignoles : 108). Tous les autres sont à 0 ou 1 SAV et 0 à 2 clients.

Le problème n'est donc pas la rétention long terme : c'est l'activation. Les gens s'inscrivent, ouvrent le logiciel, et ne créent jamais leur premier SAV. Pour savoir où ils décrochent, il faut mesurer les pages vues, le temps passé et les zones cliquées.

## Phase 1 — Double authentification (Google Authenticator)

Utilisation du MFA TOTP natif de Supabase (compatible Google Authenticator, Authy, 1Password).

- Nouvel onglet **Sécurité** dans les réglages : bouton « Activer la double authentification », affichage du QR code à scanner, saisie du code à 6 chiffres pour valider, liste des appareils enregistrés, possibilité de retirer un facteur.
- À la connexion : si le compte possède un facteur TOTP vérifié, une étape supplémentaire demande le code à 6 chiffres avant l'accès à l'application.
- **Super admin : obligatoire.** Tant que le facteur n'est pas enrôlé, l'accès à `/super-admin` affiche l'écran d'enrôlement et rien d'autre.
- **Autres comptes : optionnel** dès maintenant, activable par chacun. Un réglage global (côté super admin) permettra plus tard de le rendre obligatoire pour tous, sans nouveau développement.
- Codes de secours : génération de 8 codes à usage unique à l'activation, à conserver hors de l'app, pour ne jamais se retrouver bloqué.

## Phase 2 — Tracking maison (pages, temps passé, parcours)

Nouvelle table d'événements d'usage, alimentée automatiquement à chaque navigation dans l'application :

- page visitée, magasin, utilisateur, rôle, horodatage, durée réelle passée sur la page (mesurée à la sortie ou au changement d'onglet, pas en comptant les onglets inactifs), type d'appareil (mobile / desktop).
- Événements clés supplémentaires : première connexion, ouverture du formulaire de création de SAV, abandon avant enregistrement, premier SAV créé, premier client créé.

## Phase 3 — Heatmap interne

Oui, une heatmap maison est faisable sans outil externe :

- Capture des clics avec coordonnées relatives (pourcentage de la largeur/hauteur, pas de pixels absolus) + taille d'écran, échantillonnée pour ne pas alourdir la base.
- Restitution dans le Super Admin : sélection d'une page, superposition d'un calque de chaleur (points chauds rouges/jaunes) au-dessus d'une capture de référence de la page, filtrable par période et par type d'appareil.
- Limites assumées : pas de replay vidéo de session, pas de suivi du scroll fin en v1 (ajoutable ensuite si utile).

## Phase 4 — Tableau des inscrits + export

Dans le Super Admin, un écran **Activation** :

- Liste de tous les inscrits : date d'inscription, dernière connexion, nombre de connexions, nombre de SAV / clients créés, temps total passé dans l'app, dernière page vue avant abandon.
- Statut d'activation calculé : jamais connecté / connecté sans action / a testé / actif.
- Filtres et **export CSV** pour relancer manuellement de ton côté (pas d'envoi automatique d'emails ou de SMS à ce stade, comme demandé).

## Phase 5 — Vue synthèse « pourquoi ils décrochent »

Un panneau de synthèse : entonnoir inscription → première connexion → page la plus consultée → création du premier SAV, avec le taux de perte à chaque étape et le classement des pages où le temps passé est le plus long (signe de blocage) ou le plus court (signe d'abandon immédiat).

## Détails techniques

- MFA : `supabase.auth.mfa.enroll/challenge/verify` (TOTP), niveau AAL2 vérifié côté application ; table `user_mfa_backup_codes` (hachés) avec RLS stricte sur `auth.uid()`.
- Tracking : tables `usage_page_views` (page, durée, contexte) et `usage_click_events` (x/y relatifs), écriture en lot différée pour ne pas ralentir la navigation ; RLS en insertion pour tout utilisateur authentifié, lecture réservée au super admin ; GRANT explicites pour `authenticated` et `service_role`.
- Agrégation via fonctions SQL `security definer` pour l'écran Super Admin (pas de lecture directe de millions de lignes côté client).
- Purge automatique des événements de plus de 12 mois.
- Aucune donnée personnelle de client final n'est enregistrée dans le tracking (uniquement des chemins de page, sans identifiants de dossier).

## Ordre de livraison

1. Phase 1 (2FA super admin + option pour tous)
2. Phases 2 et 4 (tracking + tableau des inscrits exportable)
3. Phases 3 et 5 (heatmap + entonnoir)
