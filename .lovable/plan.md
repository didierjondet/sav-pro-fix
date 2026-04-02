

## Plan : Corriger l'affichage du HelpBot

### Cause du bug
Ligne 10 de `HelpBot.tsx` : `PUBLIC_ROUTES` contient `'/'`. Ligne 61 : `location.pathname.startsWith('/')` est **toujours vrai** pour toute URL. Résultat : le bot retourne `null` sur toutes les pages.

### Correction (1 seul fichier)

**Fichier : `src/components/help/HelpBot.tsx`**

Remplacer les lignes 10 et 61 par une logique qui sépare les routes exactes des routes à préfixe :

```ts
const PUBLIC_EXACT = ['/', '/landing', '/features', '/about', '/contact', '/auth', '/test', '/chrome-extension-download'];
const PUBLIC_PREFIX = ['/track/', '/quote/', '/satisfaction/', '/rdv/', '/shop/'];

// ligne 61
const isPublicRoute = PUBLIC_EXACT.includes(location.pathname) || PUBLIC_PREFIX.some(p => location.pathname.startsWith(p));
```

C'est tout. Pas de modification de routes, pas de switch dans les paramètres pour l'instant (ça n'existe pas encore), pas de changement d'architecture. Juste corriger la condition qui cache le bot partout.

### Fichier impacté
- `src/components/help/HelpBot.tsx` — lignes 10 et 61 uniquement

