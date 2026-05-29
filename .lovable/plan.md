# Brancher HelpBot sur le moteur IA configuré

## Constat
La fonction `help-bot` appelle en dur `https://ai.gateway.lovable.dev` avec `google/gemini-3-flash-preview`, ignorant la configuration `ai_engine_config` (Super Admin → Moteur IA). Les autres fonctions (`update-custom-widget`, `ai-reformulate-text`, `daily-assistant`…) utilisent déjà un helper `getAIConfig` qui lit `ai_engine_config` et déchiffre la clé API (AES-GCM).

## Modifications (`supabase/functions/help-bot/index.ts`)

1. **Ajouter le helper standard** déjà utilisé ailleurs :
   - `getDecryptionKey()` + `decryptApiKey()` (AES-GCM, secret `AI_ENCRYPTION_KEY`)
   - `getAIConfig(supabaseAdmin)` qui lit `ai_engine_config` (is_active=true) et retourne `{ url, apiKey, model }` selon le provider :
     - `lovable` → gateway Lovable + `LOVABLE_API_KEY`
     - `openai` → `https://api.openai.com/v1/chat/completions`
     - `gemini` → endpoint OpenAI-compatible Gemini
   - Fallback Lovable si aucune config active.

2. **Remplacer l'appel fetch** (lignes 350-362) :
   - Utiliser `aiConfig.url`, `aiConfig.apiKey`, `aiConfig.model` au lieu des valeurs hardcodées.
   - Garder `temperature: 0.5`, `max_tokens: 1500`, `messages`.

3. **Garder la gestion d'erreurs existante** (429/402/503) inchangée — elle reste valable quel que soit le provider.

## Hors scope
- Aucune modification UI.
- Aucune migration DB.
- Pas de changement de la logique de recherche `help_bot_knowledge` ni de `fetchShopData`.
