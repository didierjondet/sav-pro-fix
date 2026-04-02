

## Plan : Corriger l'affichage du HelpBot

### Diagnostic
Le composant HelpBot est bien integre dans `App.tsx` (ligne 167) et le code semble correct. Le probleme probable est l'un des suivants :
1. **`react-markdown` v10** est ESM-only et peut causer un crash silencieux lors du chargement du chunk
2. **La table `help_bot_faq`** peut bloquer le rendu si la requete echoue silencieusement avec RLS
3. **`useSupport()` dans `useHelpBot`** est appele inconditionnellement et peut causer un crash si le hook fait des operations qui necessitent un shop_id non encore disponible

### Corrections

**Fichier : `src/components/help/HelpBot.tsx`**

1. Remplacer `react-markdown` par un rendu simple (le markdown dans les reponses du bot est basique — gras, listes, liens). Utiliser une fonction de rendu inline simple ou `dangerouslySetInnerHTML` avec un sanitizer basique. Cela elimine la dependance ESM problematique.

2. Ajouter un `try/catch` et un `ErrorBoundary` autour du composant pour eviter le crash silencieux.

**Fichier : `src/hooks/useHelpBot.ts`**

3. Rendre l'appel `useSupport()` conditionnel — ne l'appeler dans `createTicket` qu'au moment de l'escalade, pas au montage du hook. Ou deplacer l'import `createTicket` dans la callback `sendMessage`.

4. Proteger la requete FAQ avec un guard sur la disponibilite de la session.

### Alternative simple et robuste

Remplacer `react-markdown` par un rendu markdown maison leger (regex pour **gras**, *italique*, listes, liens) directement dans le composant. Cela evite toute dependance externe problematique.

### Fichiers impactes
- `src/components/help/HelpBot.tsx` — retirer `react-markdown`, rendu markdown maison
- `src/hooks/useHelpBot.ts` — proteger les appels
- `package.json` — retirer `react-markdown` de la dependance

