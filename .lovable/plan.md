## Problème constaté

Sur le magasin d'Agde (moteur IA réglé sur **Gemini 2.5 Flash**), la question "combien j'ai de pièces en stock ?" reçoit une réponse 100% générique ("consultez votre ERP..."). Donc le contexte temps réel injecté dans le prompt n'arrive pas (ou n'est pas pris en compte) par Gemini.

Causes probables identifiées dans `supabase/functions/help-bot/index.ts` :

1. **Endpoint Gemini "OpenAI-compatible"** (`/v1beta/openai/chat/completions`) gère mal les `system` messages volumineux et **deux messages `system` séparés** (SYSTEM_PROMPT + userContext). Les ~36 KB de prompt + ~20 KB de données magasin peuvent être tronqués/ignorés silencieusement.
2. Aucun **log** ne permet de vérifier si `shopId` est bien transmis, si `fetchShopData` réussit, ni quel provider/URL/model a finalement été appelé.
3. Si `decryptApiKey` échoue, on retombe sur `LOVABLE_API_KEY` envoyé à l'URL Gemini → 401 silencieux côté UI (toast générique).
4. Les questions "stock" ne déclenchent **aucune** recherche ciblée dans `performDataLookup` (le regex couvre vitre/écran/batterie mais pas les questions globales type "combien de pièces").

## Plan de correction

### 1. `supabase/functions/help-bot/index.ts`

- **Logs de diagnostic** (visibles dans Edge Function Logs) :
  - provider/model/URL retenus par `getAIConfig`
  - `shopId` reçu, taille du `shopDataContext`, présence de `lookupContext`
  - statut HTTP de la réponse Gemini + 200 premiers caractères en cas d'erreur
- **Fusion en un seul `system` message** : concaténer `SYSTEM_PROMPT + DONNÉES MAGASIN + lookup + userContext` pour éviter le bug multi-system de Gemini.
- **Renforcement Gemini natif** : quand `provider === 'gemini'`, appeler l'endpoint natif `v1beta/models/{model}:generateContent` avec un champ `systemInstruction` dédié (gère correctement les gros contextes) au lieu de la couche OpenAI-compat.
- **Réinjection des données dans le tour utilisateur** : préfixer le message user par un rappel court "[Contexte magasin disponible : X SAV, Y pièces, Z € de stock, …]" pour forcer Gemini à s'y référer.
- **Détecteur "stock global"** dans `performDataLookup` : si le message contient `stock`, `pièce(s)`, `inventaire`, `combien`, `quantité`, on injecte directement un bloc "## RÉPONSE FACTUELLE STOCK" calculé serveur (total quantité, valeur totale, nb références, top 10, alertes basses) — la réponse devient alors évidente même si Gemini ignore le reste.
- **Détecteur "SAV global"** identique pour les questions type "combien de SAV en cours / en retard".
- **Garde-fou clé API** : si `decryptApiKey` échoue ET `Deno.env.get(api_key_name)` est vide, **rester sur Lovable AI** (URL + clé Lovable) au lieu d'envoyer la clé Lovable à l'URL Gemini.

### 2. `supabase/functions/daily-assistant/index.ts` et `ai-data-assistant/index.ts`

Mêmes correctifs ciblés et minimaux :
- même garde-fou clé API,
- fusion en un seul `system` message,
- bascule endpoint natif Gemini quand `provider === 'gemini'`,
- logs identiques.

### 3. Vérification

- Déployer les 3 functions.
- Tester depuis le HelpBot avec moteur Gemini actif sur Agde :
  - "Combien j'ai de pièces en stock ?" → doit renvoyer un nombre réel.
  - "Quels SAV en retard ?" → doit lister des numéros de dossier réels.
  - "Détaille SAV-..." → fiche dossier complète.
- Vérifier les logs (provider=gemini, shopId présent, taille prompt, statut 200).

## Hors périmètre

- Pas de changement UI, pas de migration DB, pas de nouveau provider IA.
- Pas de modification du sélecteur de moteur IA ni de l'écran Réglages.
- Aucun changement sur les autres fonctionnalités du logiciel.