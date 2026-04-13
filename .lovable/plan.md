

## Diagnostic et plan de correction

### Probleme 1 : SMS — Secret `TWILIO_PHONE_NUMBER` manquant

Le code `send-sms` (ligne 22) lit `Deno.env.get('TWILIO_PHONE_NUMBER')` et echoue en ligne 77-79 si absent. En verifiant les secrets configures, seuls `TWILIO_API_KEY` et `LOVABLE_API_KEY` sont presents. **`TWILIO_PHONE_NUMBER` n'est pas dans les secrets.** Les modifications d'aujourd'hui n'ont pas touche les secrets — il est possible que ce secret n'ait jamais ete ajoute (le SMS pouvait fonctionner via un ancien deploiement qui avait cette variable en dur ou via une autre configuration).

**Action** : Ajouter le secret `TWILIO_PHONE_NUMBER` avec la valeur de votre numero Twilio (format E.164, ex: `+33xxxxxxxxx`). Merci de me le fournir pour que je l'ajoute.

### Probleme 2 : SMS bloque la cloture SAV

Dans `SAVCloseUnifiedDialog.tsx` ligne 257-258, si le SMS echoue, un `throw` bloque toute la cloture du SAV. Le SAV ne peut pas etre cloture si le SMS ne part pas.

**Correction** : Encapsuler l'envoi SMS dans un try/catch separe. L'echec SMS affiche un toast d'avertissement mais ne bloque plus la cloture.

### Probleme 3 : `window.location.reload()` dans useSMS

Le hook `useSMS.ts` force un rechargement complet de la page apres chaque SMS reussi. C'est brutal et peut causer des pertes de donnees en cours de saisie.

**Correction** : Supprimer le `window.location.reload()`.

### Probleme 4 : Reformulation IA

Le code `ai-reformulate-text` utilise **deja** `getAIConfig()` qui lit la table `ai_engine_config` et respecte le moteur selectionne par le super admin (Gemini, OpenAI, ou Lovable AI). Le probleme n'est PAS la configuration du moteur.

L'erreur est probablement un **429 (rate limit) ou 503 (surcharge)** du service IA. Le code gere le 429 mais ne fait pas de retry. Le 503 n'est pas du tout gere.

**Correction** :
- Ajouter gestion du 503 dans `ai-reformulate-text`
- Ajouter un retry automatique (1 tentative apres 2s) pour 429 et 503
- Ameliorer la detection d'erreur dans le frontend `AITextReformulator.tsx`

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| Secret `TWILIO_PHONE_NUMBER` | A ajouter (vous devez me fournir le numero) |
| `src/components/sav/SAVCloseUnifiedDialog.tsx` | SMS dans try/catch separe |
| `src/hooks/useSMS.ts` | Supprimer `window.location.reload()` |
| `supabase/functions/ai-reformulate-text/index.ts` | Retry auto sur 429/503 |
| `src/components/sav/AITextReformulator.tsx` | Meilleure gestion erreurs |

### Ce qui ne change pas
- La logique de `send-sms` (correcte, juste le secret manquant)
- La selection du moteur IA (deja fonctionnelle dans `ai-reformulate-text`)

