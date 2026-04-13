

## Plan : Supprimer le module "Assistant IA" et corriger l'"Assistant Quotidien"

### 1. Supprimer le module "Assistant IA" (DataAssistant)

**Fichiers a modifier :**

**`src/pages/Index.tsx`** :
- Supprimer l'import de `DataAssistant`
- Supprimer la variable `isAssistantEnabled`
- Supprimer la ligne `{isAssistantEnabled && <DataAssistant />}`

**`src/pages/Settings.tsx`** :
- Supprimer `ai_assistant_enabled` du state `shopForm` et de son initialisation
- Supprimer le bloc UI du switch "Assistant IA" (lignes 1580-1602)
- Supprimer `ai_assistant_enabled` de la destructuration dans `handleSaveShop`
- Garder `assistant_enabled` dans `aiModulesConfig` pour ne pas casser la structure existante (le mettre a `false` par defaut)

**Fichier a supprimer :**
- `src/components/statistics/DataAssistant.tsx`

**Edge function conservee** : `supabase/functions/ai-data-assistant/index.ts` — on la laisse car la supprimer necessite un deploiement manuel. Elle ne sera plus appelee.

### 2. Corriger l'Assistant Quotidien (DailyAssistant)

**Diagnostic** : Les logs montrent une erreur 503 ("This model is currently experiencing high demand"). L'edge function `daily-assistant` ne gere pas le status 503, donc elle tombe dans le `throw new Error()` generique qui renvoie un status 500 au frontend. Le frontend affiche alors un message d'erreur cryptique.

**Fichier : `supabase/functions/daily-assistant/index.ts`** :
- Ajouter un gestionnaire pour le status 503 (comme pour 429 et 402) avec retry automatique (1 tentative apres 2 secondes)
- Si le retry echoue, renvoyer un message clair a l'utilisateur

**Fichier : `src/components/statistics/DailyAssistant.tsx`** :
- Ajouter la gestion de l'erreur 503 dans le frontend avec un message explicite ("Service temporairement indisponible, reessayez dans quelques instants")

### Ce qui ne change pas
- Le module "Assistant Quotidien" reste fonctionnel et configurable
- Le module "Bulle d'aide IA" (HelpBot) reste intact
- La structure `ai_modules_config` en base de donnees n'est pas modifiee
- L'edge function `ai-data-assistant` reste deployee mais n'est plus appelee

