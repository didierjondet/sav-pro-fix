## Objectif

Rendre Fixy plus chaleureux et utile : remplacer le pop "X nouveaux SAV" à chaque connexion par un accueil personnalisé, puis faire vivre Fixy avec des rappels horaires (tips, SAV qui traîne, suggestion technique).

## Diagnostic du comportement actuel

- `src/hooks/useFixyReactions.ts` émet `cheer` "X nouveaux SAV !" dès que la liste augmente. Comme le hook se monte à chaque navigation/connexion, la baseline se recalcule à chaque session → l'utilisateur voit ce pop systématiquement.
- Aucun mécanisme d'accueil ni de rappel horaire.
- `daily-assistant` (edge function existante) génère déjà des recommandations IA basées sur les SAV → réutilisable.

## Plan d'action (3 étapes, sans toucher à la BD)

### 1. Accueil de session (remplace le pop "X nouveaux SAV")

Créer un hook `useFixyWelcome` qui, **une fois par session de connexion** (clé `fixway_fixy_welcome_session` en sessionStorage), émet via le canal existant `FixyEvent` :

- Bulle 1 : salutation contextuelle selon l'heure ("Bonjour Didier ☀️", "Bon après-midi 👋", "Bonsoir 🌙") + prénom depuis `useProfile`.
- Bulle 2 (chaînée 3 s après) : `N SAV en attente. Voici tes urgences :` puis 3-4 numéros de SAV les plus urgents (tri par retard / proximité du délai max, en réutilisant `useSAVCases` + `useSAVDelay`). Cliquable → navigue vers `/sav/:id`.

Désactiver dans `useFixyReactions` l'émission `cheer "X nouveaux SAV"` au profit de cet accueil (les autres réactions — nouveau message, nouveau RDV — restent inchangées car déclenchées par un vrai évènement utilisateur).

### 2. Rappels horaires

Nouveau hook `useFixyHourlyTips` qui, toutes les **60 min** (timer + horodatage persisté dans `localStorage` pour éviter le re-déclenchement à chaque navigation), pousse une bulle Fixy aléatoire parmi :

- **Tip logiciel** (pool de ~15 astuces statiques fournies en français, ex. "Tu peux dupliquer un SAV avec le bouton ⋯", "Le QR code de suivi se génère automatiquement"…).
- **SAV qui traîne** : prend le SAV non clos le plus ancien dépassant le délai max et propose "Le SAV n°XXXX traîne depuis N jours, on regarde ?" → clic = navigation vers le SAV.
- **Suggestion technique IA** (optionnel, 1 sur 4) : appelle un nouvel edge function léger `fixy-insight` qui prend le SAV "bloqué" sélectionné + son champ `problem_description` + `repair_notes` + commentaires technicien, et renvoie 1-2 questions/pistes courtes ("As-tu testé X ?"). Réutilise la config IA déjà en place (`ai_engine_config`, `daily-assistant` comme modèle de référence).

### 3. Animation

Fixy possède déjà `animate-mascot-cheer/alert/nod/spin/love` et `idle bounce`. Ajouter dans `tailwind.config.ts` deux keyframes douces :

- `mascot-greet` : petit salut + léger zoom à l'apparition de la bulle d'accueil.
- `mascot-pulse-tip` : pulsation discrète quand un tip horaire arrive.

Aucune refonte visuelle de la mascotte, juste deux nouvelles classes d'animation déclenchées via la prop `reaction` étendue (`greet`, `tip`).

## Fichiers touchés (frontend uniquement, sauf 1 edge function optionnelle)

- `src/hooks/useFixyReactions.ts` — retirer l'émission "X nouveaux SAV" à l'init.
- `src/hooks/useFixyWelcome.ts` *(nouveau)* — accueil + urgences.
- `src/hooks/useFixyHourlyTips.ts` *(nouveau)* — boucle horaire.
- `src/components/help/FixyMascot.tsx` — accepter `reaction: 'greet' | 'tip'`.
- `src/components/help/HelpBot.tsx` — consommer les 2 nouveaux hooks (mêmes bulles que `useFixyReactions`).
- `tailwind.config.ts` — 2 keyframes.
- *(optionnel)* `supabase/functions/fixy-insight/index.ts` — micro endpoint IA pour la suggestion technique (peut être ajouté en phase 2 si tu valides d'abord les étapes 1 & 2).

## Garanties

- Pas de migration BD.
- Pas de changement sur les notifications cloche, les emails, le PDF, les RLS, l'auth.
- L'accueil ne s'affiche qu'**une fois par session navigateur** (sessionStorage), pas à chaque refetch.
- Les tips horaires restent visuels (bulle Fixy), aucun toast intrusif.
- Le pop "X nouveaux SAV" actuel disparaît, mais les vraies alertes temps réel (nouveau message client, nouveau RDV) restent.

Confirme-moi si je pars sur les 3 étapes d'un coup, ou si tu préfères qu'on valide étape 1 (accueil) avant d'enchaîner sur les tips horaires + suggestion IA.
