

## Plan : Corriger le bot IA — connexion, tickets, et base de connaissances

### Problème 1 : "Le service IA n'est pas configuré"

La table `ai_engine_config` est configurée avec `provider: 'gemini'` et `api_key_name: 'GEMINI_API_KEY'`. Or **GEMINI_API_KEY n'existe pas** dans les secrets Supabase — seul `LOVABLE_API_KEY` est disponible. Quand l'edge function fait `Deno.env.get('GEMINI_API_KEY')`, elle obtient `null` et retourne l'erreur.

**Correction** : Le HelpBot doit **toujours** utiliser le Lovable AI Gateway (`LOVABLE_API_KEY`) quel que soit le provider configuré dans `ai_engine_config`. Le `ai_engine_config` sert à configurer le moteur pour les autres fonctions IA (assistant données, widgets personnalisés), mais le HelpBot est un outil interne Fixway qui passe par le gateway Lovable directement.

**Fichier : `supabase/functions/help-bot/index.ts`**
- Supprimer la lecture de `ai_engine_config`
- Utiliser directement `LOVABLE_API_KEY` et `https://ai.gateway.lovable.dev/v1`
- Modèle : `google/gemini-3-flash-preview`

### Problème 2 : Le ticket ne se crée pas

La table `support_tickets` exige `created_by NOT NULL`, mais le code dans `useHelpBot.ts` ne l'inclut pas dans l'insert. L'insert échoue silencieusement.

**Fichier : `src/hooks/useHelpBot.ts`**
- Ajouter `created_by: user.id` dans l'insert (récupéré via session)

### Problème 3 : Le bot escalade automatiquement sans demander

Actuellement, si l'IA répond `[ESCALATE]`, le ticket est créé directement. L'utilisateur veut que le bot **propose** de transférer à un humain, et que l'utilisateur confirme.

**Fichier : `src/hooks/useHelpBot.ts`**
- Quand `data.escalate === true`, au lieu de créer le ticket directement :
  - Afficher un message avec deux boutons "Oui, créer un ticket" / "Non merci"
  - Stocker `pendingEscalation` dans le state du hook

**Fichier : `src/components/help/HelpBot.tsx`**
- Ajouter un rendu conditionnel pour les boutons d'escalade quand `pendingEscalation` est défini
- Appeler `confirmEscalation()` ou `dismissEscalation()` selon le choix

### Problème 4 : Base de connaissances et mémoire

Le bot a besoin d'une vraie base de connaissances enrichie et d'un système de mémoire.

**Migration SQL** : Créer une table `help_bot_knowledge`
```
- id uuid PK
- category text (ex: 'sav', 'stock', 'devis', 'parametres', 'abonnement', 'faq')
- question text
- answer text (réponse détaillée en markdown)
- keywords text[] (pour la recherche)
- usage_count integer DEFAULT 0
- created_at, updated_at
```

**Fichier : `supabase/functions/help-bot/index.ts`**
- Avant d'appeler l'IA, rechercher dans `help_bot_knowledge` les entrées pertinentes (recherche par mots-clés extraits du message)
- Injecter les résultats trouvés dans le prompt système comme contexte additionnel
- Après chaque réponse réussie, incrémenter `usage_count` des entrées utilisées
- Enrichir massivement le `SYSTEM_PROMPT` avec des guides pas-à-pas détaillés pour chaque module

**Données initiales** : Insérer ~30 entrées de connaissances couvrant les cas d'usage principaux :
- Comment créer un SAV pas à pas
- Gérer le stock et les alertes
- Créer et envoyer un devis
- Configurer la boutique
- Inviter un technicien
- Comprendre les statuts SAV
- Utiliser les statistiques
- Gérer les SMS
- etc.

### Résumé des fichiers impactés
- `supabase/functions/help-bot/index.ts` — gateway Lovable + recherche knowledge base
- `src/hooks/useHelpBot.ts` — fix `created_by`, escalade avec confirmation
- `src/components/help/HelpBot.tsx` — boutons confirmation escalade
- Migration SQL — table `help_bot_knowledge` + données initiales

