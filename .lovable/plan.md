
# Plan : Moteur IA configurable depuis le Super Admin

## Objectif
Permettre au super administrateur de choisir le moteur IA (Lovable AI, OpenAI ChatGPT, Google Gemini) pour l'ensemble des fonctionnalites du site, et que toutes les edge functions utilisent dynamiquement le moteur configure.

## Vue d'ensemble

Actuellement, 6 edge functions utilisent toutes le gateway Lovable AI avec le modele `google/gemini-2.5-flash` en dur :
- `ai-reformulate-text` (reformulation de texte)
- `daily-assistant` (assistant quotidien)
- `ai-data-assistant` (assistant donnees)
- `generate-custom-widget` (generation widgets)
- `update-custom-widget` (mise a jour widgets)
- `get-market-prices` (prix du marche)

Le plan consiste a :
1. Stocker la configuration du moteur IA dans une table Supabase
2. Creer une interface de gestion dans le Super Admin
3. Creer une edge function utilitaire partagee pour centraliser la logique d'appel IA
4. Modifier les 6 edge functions pour lire la config et utiliser le bon provider

---

## Etape 1 : Migration base de donnees

Creer une table `ai_engine_config` :

```text
ai_engine_config
- id (uuid, PK)
- provider: text ('lovable' | 'openai' | 'gemini')
- model: text (ex: 'google/gemini-2.5-flash', 'gpt-4o', 'gemini-2.5-pro')
- api_key_name: text (nom du secret Supabase a utiliser, ex: 'LOVABLE_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY')
- is_active: boolean (default true)
- created_at, updated_at
```

Un seul enregistrement actif a la fois (le moteur choisi globalement).

RLS : accessible uniquement par les super admins en lecture/ecriture.

## Etape 2 : Gestion des secrets API

- Pour Lovable AI : `LOVABLE_API_KEY` est deja present (auto-provisionne)
- Pour OpenAI : demander `OPENAI_API_KEY` via l'interface
- Pour Gemini : demander `GEMINI_API_KEY` via l'interface

L'interface Super Admin affichera un champ pour saisir la cle API selon le provider choisi. La cle sera stockee via Supabase secrets (edge function dediee).

## Etape 3 : Nouveau menu Super Admin "Moteur IA"

Ajouter dans la section "Configuration" du sidebar :
- Icone : `Brain` (lucide-react)
- ID : `ai-engine`
- Titre : "Moteur IA"

### Interface du composant `AIEngineManager.tsx` :

- **Selection du provider** : 3 cartes radio (Lovable AI, OpenAI, Google Gemini)
  - Chaque carte affiche le nom, une description, les modeles disponibles
- **Selection du modele** : dropdown des modeles disponibles pour le provider choisi
  - Lovable : gemini-2.5-flash, gemini-2.5-pro, gpt-5, gpt-5-mini
  - OpenAI : gpt-4o, gpt-4o-mini, gpt-3.5-turbo
  - Gemini : gemini-2.5-flash, gemini-2.5-pro, gemini-1.5-flash
- **Cle API** : champ pour saisir/modifier la cle API (masque apres saisie)
  - Lovable : afficher "Pre-configure automatiquement"
  - OpenAI/Gemini : champ de saisie + bouton sauvegarder
- **Bouton de test** : envoyer une requete de test pour verifier que la config fonctionne
- **Statut** : indicateur vert/rouge du dernier test

## Etape 4 : Edge function `save-ai-config`

Nouvelle edge function pour :
- Sauvegarder la configuration du moteur IA dans la table
- Stocker les cles API en tant que secrets Supabase (via `SUPABASE_SERVICE_ROLE_KEY`)
- Tester la connexion au provider choisi

## Etape 5 : Modification des 6 edge functions existantes

Chaque edge function sera modifiee pour :

1. Lire la config depuis `ai_engine_config` (WHERE is_active = true)
2. Determiner l'URL et la cle API selon le provider :
   - `lovable` : URL = `https://ai.gateway.lovable.dev/v1/chat/completions`, key = `LOVABLE_API_KEY`
   - `openai` : URL = `https://api.openai.com/v1/chat/completions`, key = `OPENAI_API_KEY`
   - `gemini` : URL = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, key = `GEMINI_API_KEY`
3. Utiliser le modele configure

Le code commun sera une fonction helper au debut de chaque edge function (pas de sous-dossiers dans les edge functions) :

```text
async function getAIConfig(supabase) {
  const { data } = await supabase
    .from('ai_engine_config')
    .select('*')
    .eq('is_active', true)
    .single();

  if (!data) {
    // Fallback sur Lovable AI
    return {
      url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
      apiKey: Deno.env.get('LOVABLE_API_KEY'),
      model: 'google/gemini-2.5-flash'
    };
  }

  const apiKey = Deno.env.get(data.api_key_name);
  // ... retourner url, apiKey, model selon provider
}
```

## Etape 6 : Integration dans SuperAdmin.tsx

- Ajouter le cas `ai-engine` dans `renderActiveSection()`
- Importer et afficher `AIEngineManager`

---

## Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `src/components/admin/AIEngineManager.tsx` | Interface de configuration du moteur IA |
| `supabase/functions/save-ai-config/index.ts` | Edge function pour sauvegarder config + secrets |
| Migration SQL | Table `ai_engine_config` + RLS |

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/admin/SuperAdminSidebar.tsx` | Ajouter menu "Moteur IA" dans Configuration |
| `src/pages/SuperAdmin.tsx` | Ajouter le case `ai-engine` |
| `supabase/config.toml` | Ajouter config pour `save-ai-config` |
| `supabase/functions/ai-reformulate-text/index.ts` | Utiliser config dynamique |
| `supabase/functions/daily-assistant/index.ts` | Utiliser config dynamique |
| `supabase/functions/ai-data-assistant/index.ts` | Utiliser config dynamique |
| `supabase/functions/generate-custom-widget/index.ts` | Utiliser config dynamique |
| `supabase/functions/update-custom-widget/index.ts` | Utiliser config dynamique |
| `supabase/functions/get-market-prices/index.ts` | Utiliser config dynamique |

## Points d'attention

- **Fallback** : si aucune config n'est definie ou si la cle API est absente, le systeme utilisera Lovable AI par defaut (comportement actuel preserve)
- **Pas de regression** : les prompts systeme et la logique metier de chaque edge function restent identiques, seul le point d'appel IA change
- **Compatibilite API** : OpenAI et Gemini (via endpoint compatible OpenAI) utilisent le meme format de requete/reponse que le gateway Lovable, donc les modifications sont minimales
- **Securite** : les cles API sont stockees en tant que secrets Supabase, jamais exposees cote client
