## Contexte

Tu as raison, je m'en excuse — les FAQ ont bien été supprimées de l'UI HelpBot à ta demande (cf. mémoire `[Assistant Removal]`). L'absence de FAQ dans le bot est **normale**, ce n'est pas une régression. Les tests que je t'avais donnés (cliquer une FAQ) ne sont donc pas valables.

## Où on en est

**Étape 1 — TERMINÉE côté code** : la table `help_bot_faq` est sécurisée (UPDATE réservé à `service_role`, RPC `increment_faq_click` créée). Comme l'UI FAQ n'existe plus, cette étape n'a **aucun impact visible utilisateur**. Le seul risque serait une régression côté backend (edge function `help-bot` ou hook `useHelpBot`).

## Nouveau protocole de test Étape 1 (adapté à la réalité)

Au lieu de tester les FAQ (qui n'existent plus dans l'UI), on vérifie que **le HelpBot tout court fonctionne toujours** :

1. **Ouvrir Fixy** (bouton en bas à droite) → la bulle bleue "Je suis Fixy…" doit s'afficher (comme sur ta capture). ✅ Déjà confirmé par ta capture.
2. **Poser une question** dans le champ "Posez votre question…" (ex : "combien j'ai de SAV en cours ?") → Fixy doit répondre normalement.
3. **Vérifier la console navigateur** (F12 → Console) : aucune erreur rouge mentionnant `help_bot_faq`, `increment_faq_click`, ou `useHelpBot`.
4. **Vérifier l'onglet Network** (F12 → Network) : aucun appel en 4xx/5xx sur `/rest/v1/help_bot_faq` ou `/rest/v1/rpc/increment_faq_click`.

Si les 4 points sont verts → Étape 1 validée, on passe à l'Étape 2.
Si un point casse → rollback immédiat de la migration Étape 1.

## Rappel du plan global (inchangé)

- **Étape 1** : `help_bot_faq` — UPDATE restreint + RPC click counter ✅ code livré, **à valider par toi**
- **Étape 2** : `subscribers` — restreindre SELECT/UPDATE à `auth.uid() = user_id` (suppression accès par email)
- **Étape 3** : `prospects` — restreindre lecture publique (données commerciales sensibles)
- **Étape 4** : `customers` — vérifier qu'aucune policy ne fuit email/téléphone hors du shop
- **Étape 5** : `messaging_providers` / `ai_engine_config` — confirmer que les clés chiffrées ne sont jamais retournées en clair via SELECT

Chaque étape suivra le même rituel : **1 migration ciblée → consignes de test prod précises → ta validation → étape suivante**. Je ne touche à rien d'autre.

## Action attendue de toi

Fais les 4 vérifications ci-dessus et dis-moi :
- ✅ "go étape 2" si tout est vert
- ❌ décris ce qui casse (message console, code HTTP, comportement Fixy) → je rollback
