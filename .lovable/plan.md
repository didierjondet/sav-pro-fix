
Correction ciblée de la reformulation IA

Constat
- Votre demande est légitime: la reformulation doit utiliser le moteur IA actif configuré par le super admin.
- En lisant le code, `ai-reformulate-text` consulte bien `ai_engine_config`, donc la base structurelle existe déjà.
- En revanche, la fonction a 2 défauts majeurs qui donnent l’impression qu’elle “passe encore par Lovable” :
  1. elle retombe silencieusement sur Lovable si la lecture de config, le déchiffrement de clé, ou le mapping provider échoue ;
  2. elle renvoie souvent une erreur générique `Erreur lors de la reformulation`, donc on ne voit jamais si Gemini a réellement été utilisé ni pourquoi ça casse.

Ce que je vais corriger
1. Fiabiliser la sélection du moteur dans `supabase/functions/ai-reformulate-text/index.ts`
- supprimer le fallback silencieux vers Lovable quand une config active existe mais est invalide
- distinguer clairement 3 cas :
  - aucune config active => fallback assumé
  - config `lovable` active => usage Lovable assumé
  - config `gemini` ou `openai` active => obligation d’utiliser ce provider, sinon erreur explicite
- ajouter des logs structurés indiquant :
  - provider actif détecté
  - modèle utilisé
  - type de clé utilisée (clé chiffrée DB ou secret env, sans jamais exposer la valeur)
  - URL cible appelée

2. Corriger la logique Gemini
- vérifier le format exact envoyé à l’endpoint Gemini compatible OpenAI déjà utilisé dans le projet
- harmoniser `ai-reformulate-text` avec les autres fonctions IA qui lisent `ai_engine_config`
- s’assurer que si `provider = gemini`, l’appel part bien sur l’URL Gemini et non sur la gateway Lovable

3. Améliorer les erreurs backend
- ne plus renvoyer seulement `Erreur lors de la reformulation`
- propager les causes réelles :
  - clé API Gemini absente
  - échec de déchiffrement de la clé enregistrée
  - provider inconnu
  - modèle invalide
  - 401 / 400 / 429 / 503 du provider
- inclure dans la réponse un message exploitable côté interface

4. Améliorer le frontend `src/components/sav/AITextReformulator.tsx`
- extraire le vrai message d’erreur retourné par l’edge function au lieu de se baser seulement sur `error.message`
- afficher un toast spécifique si :
  - la config IA active est invalide
  - la clé Gemini n’est plus lisible
  - le modèle configuré n’est pas accepté
  - le service est temporairement indisponible
- conserver la logique de retry déjà ajoutée pour 429/503

5. Validation après correction
- tester la reformulation sur plusieurs contextes:
  - description du problème
  - commentaires technicien
  - commentaires privés
  - SMS
- vérifier dans les logs de `ai-reformulate-text` que le provider utilisé est bien `gemini`
- vérifier qu’en cas d’erreur, le message affiché ne parle plus vaguement de reformulation mais de la vraie cause

Fichiers concernés
- `supabase/functions/ai-reformulate-text/index.ts`
- `src/components/sav/AITextReformulator.tsx`

Détail technique important
- Aujourd’hui, le vrai problème n’est pas que la fonction ignore totalement `ai_engine_config`.
- Le problème est qu’elle peut masquer un échec de configuration en retombant sur Lovable, puis masquer encore l’échec final avec un message générique.
- Le correctif structurel sera donc: “provider strict si configuré”, avec logs explicites et erreurs réelles visibles.
