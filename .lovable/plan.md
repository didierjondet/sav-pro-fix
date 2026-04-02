

## Plan : Widgets par defaut pour nouveaux magasins + Bot IA d'aide utilisateur

Ce plan couvre deux fonctionnalites distinctes.

---

### Partie 1 : Configuration par defaut des widgets pour nouveaux magasins

**Probleme actuel** : `useStatisticsConfig.ts` active TOUS les widgets par defaut avec la temporalite globale. Un nouveau magasin voit trop de widgets, et pas en mois calendaire.

**Modification : `src/hooks/useStatisticsConfig.ts`**

1. Modifier `DEFAULT_MODULES` pour ne mettre `enabled: true` que sur les 10 widgets souhaites :
   - `finance-kpis`, `financial-overview`, `parts-usage-heatmap`, `sav-stats`, `late-rate`, `top-parts-chart`, `late-rate-chart`, `top-devices`, `revenue-breakdown`, `customer-satisfaction`
   - Tous les autres (`storage-usage`, `annual-stats`, `performance-trends`, `kpi-revenue`, `kpi-expenses`, `kpi-profit`, `kpi-takeover`, `monthly-comparison`, `quote-rejections`) seront `enabled: false`

2. Creer une configuration par defaut en mois calendaire pour ces widgets. Au premier chargement (pas de localStorage), inserer automatiquement des `widget_configurations` avec `temporality: 'monthly_calendar'` pour les 10 widgets actifs via un upsert Supabase.

**Modification : `src/hooks/useWidgetConfiguration.ts`**

3. Ajouter une fonction `initializeDefaultConfigurations` appelee une seule fois (flag localStorage `widgetsDefaultsInitialized_<shopId>`) qui cree les 10 configurations en `monthly_calendar`.

---

### Partie 2 : Bot IA d'aide utilisateur

**Architecture** :

```text
┌─────────────────────────────┐
│  HelpBot (flottant, bas-droite) │
│  ├─ Bulle avec icone robot     │
│  ├─ Panel chat expandable      │
│  │  ├─ Questions suggerees     │
│  │  ├─ Zone messages           │
│  │  └─ Champ de saisie libre   │
│  └─ Auto-creation ticket si    │
│     hors competence            │
└─────────────────────────────┘
         ↓ appel
   Edge Function: help-bot
         ↓
   Lovable AI Gateway
```

**Fichiers a creer :**

1. **`supabase/functions/help-bot/index.ts`** — Edge function dediee
   - System prompt detaille decrivant TOUTES les fonctionnalites du logiciel (SAV, pieces, devis, clients, statistiques, agenda, commandes, SMS, parametres, abonnement, support)
   - Recoit le message + l'historique de conversation + le contexte utilisateur (profil rempli?, boutique configuree?, etc.)
   - Si l'IA detecte qu'elle ne peut pas repondre, elle retourne un flag `escalate: true` avec un resume de la demande
   - Verification de la completude du profil/boutique pour guider l'utilisateur

2. **`src/components/help/HelpBot.tsx`** — Composant principal du bot
   - Bulle flottante en bas a droite (`fixed bottom-4 right-4 z-50`)
   - Panel de chat avec scroll, rendu Markdown des reponses
   - Questions suggerees dynamiques a l'ouverture :
     - Stockees dans une table Supabase `help_bot_faq` (question, click_count, category)
     - Triees par `click_count` descendant pour afficher les plus populaires
     - Questions par defaut initiales : "Comment creer un dossier SAV ?", "Comment ajouter une piece au stock ?", "Comment configurer mon profil ?", "Comment envoyer un SMS a un client ?"
   - Verification du profil/boutique : si incomplet, afficher une suggestion de configuration en priorite
   - Champ libre en bas pour poser n'importe quelle question
   - Si `escalate: true` dans la reponse : toast + creation auto d'un ticket support via `useSupport().createTicket()`

3. **`src/hooks/useHelpBot.ts`** — Hook gerant l'etat du chat
   - Historique des messages (en memoire, pas persiste)
   - Appel a l'edge function `help-bot`
   - Gestion du streaming (SSE)
   - Logique d'escalade vers ticket support

**Modification : `src/App.tsx`**
   - Ajouter `<HelpBot />` dans le layout global, visible uniquement pour les utilisateurs authentifies (pas sur les pages publiques landing/track/quote)

**Migration SQL :**
   - Table `help_bot_faq` : `id`, `shop_id` (nullable, null = global), `question`, `click_count`, `category`, `created_at`
   - RLS : lecture publique pour les questions globales, lecture/ecriture par shop pour les questions specifiques
   - Seed avec les 6 questions initiales (globales)

### Detail technique du system prompt

Le prompt systeme du bot inclura :
- Description complete de chaque module (SAV, pieces, devis, clients, stats, agenda, commandes, parametres, SMS, support)
- Navigation : quelles pages existent et comment y acceder
- Workflows courants (creer SAV, ajouter piece, generer devis, envoyer SMS)
- Instruction explicite : si la question sort du perimetre du logiciel, repondre qu'on passe la main a un humain et retourner `escalate: true`

### Fichiers impactes
- `src/hooks/useStatisticsConfig.ts` — defaults widgets
- `src/hooks/useWidgetConfiguration.ts` — init monthly_calendar
- `supabase/functions/help-bot/index.ts` — nouveau
- `src/components/help/HelpBot.tsx` — nouveau
- `src/hooks/useHelpBot.ts` — nouveau
- `src/App.tsx` — integration du bot
- Migration SQL — table `help_bot_faq`

