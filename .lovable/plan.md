## Objectif
Masquer définitivement le module "Configuration" (OnboardingPanel) du HelpBot 15 jours après que la configuration ait atteint 100 %.

## Logique

La table `shop_onboarding_progress` possède déjà une colonne `completed_at`. Elle n'est actuellement pas remplie automatiquement.

### Étape 1 — Marquer la complétion
Dans `useOnboardingProgress.ts` : quand `isFullyConfigured === true` et que `progress.completed_at` est `null`, faire un upsert pour écrire `completed_at = now()`. Une seule fois (effet déclenché par changement d'état).

### Étape 2 — Calculer l'expiration
Exposer depuis le hook un nouveau flag :
- `isOnboardingExpired = !!completed_at && (now - completed_at) >= 15 jours`

### Étape 3 — Masquer le panneau dans le HelpBot
Dans `HelpBot.tsx`, modifier `canSeeOnboarding` :
```ts
const canSeeOnboarding =
  !!profile
  && ['admin', 'shop_admin', 'super_admin'].includes(profile.role)
  && !isOnboardingExpired;
```
Cela masque à la fois le panneau interne et le badge d'attraction (`shouldAttract` dépend déjà de `canSeeOnboarding`).

### Étape 4 — Cas du restart
Si l'utilisateur clique sur "Recommencer" (`restartOnboarding`), le upsert remet déjà `completed_at: null`. Le module redevient donc visible jusqu'à la prochaine complétion + 15 jours.

## Fichiers impactés
- `src/hooks/useOnboardingProgress.ts` — auto-set `completed_at`, calcul + retour de `isOnboardingExpired`.
- `src/components/help/HelpBot.tsx` — utiliser `isOnboardingExpired` dans `canSeeOnboarding`.

Aucune migration SQL nécessaire (colonne `completed_at` déjà présente).
