

## Plan : Faire fonctionner le HelpBot + ajouter son switch dans les paramètres IA

### Problème 1 : Le bot répond toujours "problème technique"
L'edge function `help-bot` utilise l'URL `https://api.lovable.dev/v1` qui est incorrecte. L'URL correcte du gateway Lovable AI est `https://ai.gateway.lovable.dev/v1`. C'est la cause de l'erreur systématique.

### Problème 2 : Pas de switch dédié au HelpBot
Le switch `assistant_enabled` existant dans l'onglet IA des paramètres contrôle le `DataAssistant` (assistant de données sur le tableau de bord), pas le HelpBot. Il faut un switch séparé.

---

### Corrections

**Fichier : `supabase/functions/help-bot/index.ts`**

1. Corriger l'URL du gateway : `https://api.lovable.dev/v1` → `https://ai.gateway.lovable.dev/v1`
2. Changer le modèle par défaut : `google/gemini-2.5-flash` → `google/gemini-3-flash-preview` (recommandé)
3. Retirer `response_format: { type: 'json_object' }` et parser le JSON dans la réponse texte (plus robuste, certains modèles ne supportent pas ce format)

**Fichier : `src/pages/Settings.tsx`**

4. Ajouter un nouveau switch `ai_helpbot_enabled` dans l'onglet IA, avec description "Bulle d'aide en bas à droite de l'écran pour guider les utilisateurs dans l'utilisation de Fixway"
5. Sauvegarder dans `ai_modules_config.helpbot_enabled`
6. Valeur par défaut : `true`

**Fichier : `src/components/help/HelpBot.tsx`**

7. Lire `shop.ai_modules_config.helpbot_enabled` via `useShop()` et ne rendre le bot que si cette valeur n'est pas explicitement `false`

**Fichier : `src/hooks/useHelpBot.ts`**

8. Retirer la dépendance inutile à `useSupport` (si encore présente)

### Fichiers impactés
- `supabase/functions/help-bot/index.ts` — URL corrigée + modèle
- `src/pages/Settings.tsx` — nouveau switch HelpBot
- `src/components/help/HelpBot.tsx` — lire la config shop pour afficher/masquer

