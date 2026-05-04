## Objectif

Mettre en place un système d'**onboarding assisté** intégré à l'Assistant Fixway (HelpBot) qui :
- Détecte automatiquement les magasins dont la configuration est incomplète
- Propose un parcours étape par étape réutilisable à tout moment
- Suit la progression dans le temps (reprenable)
- Attire l'attention via une **animation de tremblement** sur l'icône du bot tant qu'il reste des étapes critiques à compléter

---

## 1. Étapes d'onboarding couvertes

Bloc en haut du HelpBot, avec barre de progression (X/N étapes complétées) :

1. **Compléter le profil** (nom, prénom, téléphone)
2. **Configurer le magasin** (nom, email, téléphone, adresse, logo)
3. **Définir les types de SAV** (au moins 1 type créé)
4. **Définir les statuts SAV** (vérifier la présence de statuts personnalisés)
5. **Ajouter une première pièce détachée** (au moins 1 entrée dans `parts`)
6. **Configurer les horaires d'ouverture** (agenda)
7. **Inviter un membre / créer un compte technicien** (optionnel)
8. **Créer son premier SAV de test** (au moins 1 SAV)
9. **Comprendre la messagerie client** (mini tutoriel — marqué comme "vu")
10. **Personnaliser les SMS / message de suivi**

Chaque étape :
- Statut auto-détecté via requête (`completed`, `pending`)
- OU marquée manuellement "vu" pour les étapes pédagogiques (stockée en DB)
- Bouton **"Y aller"** → navigue vers la page concernée
- Bouton **"Aide"** → envoie automatiquement une question préformatée à l'assistant

---

## 2. Détection & persistance

### Nouvelle table `shop_onboarding_progress`
- `shop_id` (PK, FK shops)
- `steps_seen` (jsonb) — étapes manuellement marquées vues
- `dismissed_until` (timestamp, nullable) — pour masquer le shake temporairement
- `completed_at` (timestamp, nullable) — quand tout est terminé

### Hook `useOnboardingProgress`
Retourne pour chaque étape :
```ts
{ id, label, description, status: 'done' | 'pending', actionRoute, helpQuestion }
```
Détection via :
- Profile/Shop déjà chargés via contexts
- Requêtes count() légères : `sav_types`, `sav_statuses`, `parts`, `sav_cases`, `shop_working_hours`

Le hook expose : `progress` (0-100), `pendingCount`, `isFullyConfigured`.

---

## 3. UI — Module dans le HelpBot

Quand le HelpBot est ouvert, ajouter en haut de la zone messages un **bloc collapsible** :

```
┌─────────────────────────────────────┐
│ 🚀 Configuration de votre magasin   │
│ ████████░░ 7/10 étapes              │
│ ▼ Voir les étapes restantes         │
└─────────────────────────────────────┘
```

Déplié : liste verticale des étapes avec icônes ✓ / ○, bouton "Y aller" et "Aide".

- Lorsqu'une étape se complète → toast de félicitation
- Lorsque tout est terminé → message final + l'utilisateur peut toujours rouvrir le module via un bouton "Revoir le parcours d'accueil"

---

## 4. Animation "tremblement" de l'icône

Sur le bouton fermé du HelpBot (`fixed bottom-4 right-4`) :
- Si `pendingCount > 0` ET `dismissed_until` est passé : ajouter classe `animate-onboarding-shake`
- Animation toutes les ~10s (3 oscillations rapides), pas en continu pour ne pas être pénible
- Petit badge rouge avec le nombre d'étapes restantes
- Stoppe automatiquement quand `pendingCount === 0`

Définition keyframe à ajouter dans `tailwind.config.ts` :
```js
'wiggle': { '0%,100%': { transform: 'rotate(0)' }, '25%': { transform: 'rotate(-10deg)' }, '75%': { transform: 'rotate(10deg)' } }
animation: { 'wiggle-attention': 'wiggle 0.5s ease-in-out 3' }
```
Déclenché via `setInterval` côté composant.

---

## 5. Intégration côté Assistant IA

Le système prompt de l'edge function `help-bot` reçoit déjà `userContext`. On enrichit avec `onboardingPending: string[]` pour que le bot puisse :
- Proposer proactivement la prochaine étape
- Répondre de façon contextualisée si l'utilisateur clique "Aide" sur une étape (question préformatée du genre *"Comment configurer mes types de SAV ?"*)

---

## 6. Détails techniques

### Fichiers créés
- `supabase/migrations/...` — table `shop_onboarding_progress` + RLS (admin du shop peut lire/écrire son propre onboarding)
- `src/hooks/useOnboardingProgress.ts`
- `src/components/help/OnboardingPanel.tsx` — bloc UI affiché dans HelpBot
- `src/components/help/OnboardingStepRow.tsx`

### Fichiers modifiés
- `src/components/help/HelpBot.tsx` — intégrer `<OnboardingPanel />` en haut de la zone messages + animation shake + badge sur l'icône fermée
- `tailwind.config.ts` — keyframe `wiggle` + animation `wiggle-attention`
- `supabase/functions/help-bot/index.ts` — accepter `onboardingPending` dans le payload et l'inclure dans le system prompt
- `src/hooks/useHelpBot.ts` — passer `onboardingPending` dans le body de l'invoke

### Permissions
- Visible uniquement pour rôles `admin` et `shop_admin` (les techniciens n'ont pas à configurer le magasin)
- Étape "Inviter un membre" cachée pour `shop_admin` si plan ne le permet pas

### Reprise volontaire
- Bouton **"Relancer l'onboarding"** dans **Paramètres > Préférences** qui :
  - Réinitialise `dismissed_until = null`
  - Force l'ouverture du HelpBot avec le panel onboarding déplié

---

## 7. Hors périmètre (pour plus tard si besoin)

- Tour guidé en surimpression sur les pages (style Intro.js)
- Vidéos tutorielles dans chaque étape
- Notifications email de relance pour les magasins inactifs depuis X jours

---

**Résumé** : un panneau onboarding intelligent dans l'Assistant Fixway, avec détection automatique de l'avancement, navigation directe vers les pages concernées, aide contextualisée par l'IA, animation de l'icône pour inciter à l'action, et possibilité de reprendre/relancer le parcours à tout moment.