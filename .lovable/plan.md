

## Correction : Conversations bot dupliquees

### Probleme identifie

Dans `useHelpBot.ts`, `persistConversation` est un `useCallback` qui capture `conversationId` dans sa closure. Quand le premier message est envoye :

1. `conversationId` est `null` -- `persistConversation` fait un `INSERT` et appelle `setConversationId(data.id)`
2. Mais `setConversationId` est asynchrone (React state) -- au prochain appel de `persistConversation`, la closure utilise encore l'ancien `conversationId === null`
3. Resultat : un deuxieme `INSERT` au lieu d'un `UPDATE`, creant une deuxieme ligne en base

### Solution

Remplacer `useState` par `useRef` pour `conversationId` afin d'eviter les closures perimees :

**Fichier modifie : `src/hooks/useHelpBot.ts`**

- Changer `const [conversationId, setConversationId] = useState<string | null>(null)` en `const conversationIdRef = useRef<string | null>(null)`
- Dans `persistConversation` : lire/ecrire `conversationIdRef.current` au lieu de `conversationId`
- Dans `clearMessages` : reset `conversationIdRef.current = null`
- Retirer `conversationId` des dependances du `useCallback`

Cela garantit qu'une seule ligne en base est creee par session de conversation, et que tous les messages sont accumules dans le meme enregistrement JSONB.

