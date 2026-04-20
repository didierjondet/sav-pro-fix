

## Plan : Corriger la gestion des erreurs IA et informer sur les limites

### Cause racine

La clé Google Gemini configurée dans Super Admin utilise le **plan gratuit Google** (20 requêtes/jour/modèle). Après quelques appels (assistant + reformulations), le quota est épuisé → erreur 429. Le message d'erreur détaillé est ensuite perdu car les edge functions retournent des statuts HTTP non-200 que `supabase.functions.invoke` masque.

### Deux options pour résoudre le problème de fond

1. **Passer par Lovable AI** (recommandé) : Dans Super Admin > Moteur IA, sélectionner "Lovable" comme provider. Le quota est bien plus élevé et la clé est pré-configurée.
2. **Upgrader le plan Google** : Passer à un plan payant Google pour augmenter les quotas (pas géré côté code).

### Corrections techniques (2 edge functions)

**Fichier 1 : `supabase/functions/daily-assistant/index.ts`**

- Retourner **HTTP 200** pour toutes les erreurs IA (429, 402, 503) avec le message dans `{ error: "..." }`. Le client gère déjà parfaitement `data.error` (lignes 36-63 de DailyAssistant.tsx).
- Ajouter un **retry avec délai de 3 secondes** pour les erreurs 429 (comme déjà fait pour 503).

**Fichier 2 : `supabase/functions/ai-reformulate-text/index.ts`**

- Même correction : retourner HTTP 200 au lieu de 429/402/503/401, avec le message d'erreur dans le body JSON.
- Le client `AITextReformulator.tsx` gère déjà `data.error`.

### Détail des changements

Pour les deux fichiers, remplacer les blocs de retour d'erreur comme :
```typescript
// AVANT
return new Response(
  JSON.stringify({ error: 'Rate limit...' }),
  { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// APRÈS
return new Response(
  JSON.stringify({ error: 'Rate limit...' }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

Pour `daily-assistant` uniquement, ajouter un retry 429 (similaire au retry 503 existant) :
```typescript
if (aiResponse.status === 429) {
  console.log('⏳ Retry 429 dans 3s...');
  await new Promise(r => setTimeout(r, 3000));
  const retryResponse = await fetch(...);
  if (retryResponse.ok) { /* retourner le résultat */ }
  // sinon retourner l'erreur en HTTP 200
}
```

### Comportement attendu après correctif

- Les messages d'erreur explicites s'affichent dans les toasts (ex: "Limite de requêtes Gemini atteinte. Réessayez dans quelques instants.")
- Un retry automatique est tenté avant d'abandonner
- L'utilisateur comprend clairement le problème et peut agir (changer de provider ou attendre)

### Ce qui ne change pas

- Les composants client (`DailyAssistant.tsx`, `AITextReformulator.tsx`) — déjà correctement implémentés
- La logique de configuration IA, le chiffrement des clés
- La table `ai_engine_config`

