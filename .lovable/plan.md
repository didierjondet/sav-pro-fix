
# Objectif

Rendre l'assistant IA (HelpBot + assistants associés) :
1. **Omniscient sur le logiciel** : connaît toutes les fonctionnalités, pages, règles métier Fixway.
2. **Capable d'interroger les données réelles** du magasin (SAV, pièces, clients, devis, agenda, finances).
3. **Compétent comme technicien réparateur** (smartphones, tablettes, consoles, objets hi-tech) pour aider au diagnostic.
4. **Indépendant du moteur IA choisi** (Lovable, OpenAI, Gemini) — toutes les capacités s'appliquent quel que soit le provider.

L'architecture multi-provider existe déjà (`getAIConfig` dans chaque edge function). On enrichit donc le **contenu** envoyé aux IA (prompts + contexte de données), pas le routage.

# Modifications

## 1. `supabase/functions/help-bot/index.ts` (assistant principal)

### a) Enrichir `SYSTEM_PROMPT` avec un volet "Technicien expert"

Ajouter une grande section **"## 🔧 Compétences techniques (réparateur expert)"** au prompt avec :

- **Marques & modèles** : Apple (iPhone 6 → 17 Pro Max, iPad, MacBook), Samsung (S/A/Note/Z Fold/Flip), Xiaomi/Redmi/Poco, Huawei, Oppo, Google Pixel, OnePlus, consoles (Switch, PS4/5, Xbox), montres connectées.
- **Pannes courantes par catégorie** :
  - Écran (LCD/OLED, tactile, vitre, true tone iPhone, point bleu Samsung)
  - Batterie (gonflement, autonomie, cycles, calibration, message "service")
  - Charge (connecteur Lightning/USB-C/micro-USB, nappe, IC charge)
  - Audio (haut-parleur, écouteur, micro, jack)
  - Caméra (avant/arrière, autofocus, capteur, vitre objectif)
  - Boutons (power, volume, home/Touch ID, Face ID)
  - Connectique (Wi-Fi, Bluetooth, SIM, Face ID, NFC)
  - Logique (court-circuit, oxydation, désoudage, BGA)
  - Logiciel (iCloud lock, FRP, bootloop, restauration DFU, root)
- **Procédures de diagnostic** : checklist standard (alimentation → écran → tactile → composants), tests à effectuer avant démontage, mesures multimètre courantes (tensions batterie, lignes d'alim), interprétation des codes erreurs (Apple Diags, Samsung *#0*#).
- **Pièces & qualité** : OEM vs compatible, grades (Original/Refurb/Soft OLED/Hard OLED/Incell), risques d'incompatibilité (true tone, capteur de luminosité, Face ID après changement écran iPhone).
- **Estimation de durée** : temps moyens par intervention (écran iPhone 30-45min, batterie 20-30min, connecteur de charge 45-60min, désoudage 1-2h).
- **Sécurité** : précautions ESD, batteries Li-ion (perçage = feu), oxydation (ne pas charger), données client (sauvegarde avant DFU).
- **Conseils au technicien** : poser les bonnes questions au client (chute ? eau ? depuis quand ? fonctionne en partie ?), différencier garantie vs hors-garantie, justifier un devis refusé.

L'assistant pourra ainsi répondre à des questions comme :
- "Le tactile ne répond plus en haut de l'écran d'un iPhone 11, que vérifier ?"
- "Combien facturer un changement de connecteur de charge sur S22 ?"
- "Quel grade d'écran pour un iPhone 13 Pro ?"

### b) Élargir `fetchShopData` (contexte données temps réel)

Ajouter aux requêtes parallèles :
- **SAV avec détails complets** : top 20 actifs avec problème, IMEI, accessoires, total pièces (pas juste les 10 derniers basiques).
- **Pièces les plus utilisées** (top 15 via `get_parts_statistics`).
- **Agenda du jour + 7 prochains jours** (`appointments`).
- **Messages clients non lus** (`sav_messages` côté client).
- **Devis en attente d'acceptation** (statut "sent").
- **Satisfaction récente** (`satisfaction_surveys` 30 derniers jours, note moyenne).
- **Finances mensuelles** : CA, marge, coût pièces (réutiliser logique `useStatistics`).
- **Fournisseurs actifs** (`suppliers`).
- **Techniciens du magasin** (`profiles` du shop, rôle, dernière connexion).

### c) Mécanisme d'interrogation à la demande (data lookup)

Ajouter une fonction `performDataLookup(message, shopId)` exécutée **avant** l'appel IA :
- Détecte les patterns dans la question utilisateur (regex sur mots-clés : "SAV SAV-2024-", "client Dupont", "pièce vitre iPhone 13", "stock", "facture", "RDV demain").
- Lance des requêtes Supabase ciblées (recherche par `case_number`, `customer.last_name`, `parts.name ilike`, etc.).
- Injecte les résultats dans un bloc `## 🔍 Données spécifiques à la question` ajouté au system prompt.

Avantage : pas besoin de function calling (compatibilité multi-provider garantie), réponses précises sur des entités nommées.

## 2. `supabase/functions/daily-assistant/index.ts` & `supabase/functions/ai-data-assistant/index.ts`

Mêmes ajouts ciblés :
- Inclure le **volet technicien** dans leur system prompt (version condensée — leur rôle est l'analyse, pas le diagnostic, mais ils doivent comprendre la nature des SAV).
- Le `daily-assistant` génère ainsi des recommandations plus pertinentes (ex: "3 SAV iPhone 14 Pro Max attendent un écran soft OLED — regrouper la commande chez X fournisseur").
- Le `ai-data-assistant` peut interpréter techniquement les chiffres (ex: "taux de retour élevé sur les batteries compatibles").

## 3. Compatibilité multi-provider

Le code actuel utilise déjà `getAIConfig` partout. Aucun changement de routage. On vérifie juste que :
- Le format `messages` envoyé reste OpenAI-compatible (Gemini via endpoint OpenAI-compat l'accepte).
- On limite `max_tokens` à 2000 (au lieu de 1500) pour permettre des réponses techniques détaillées.
- On garde `temperature: 0.5` (équilibre précision/créativité).

## Hors périmètre

- Pas de nouveau provider IA.
- Pas de modification de l'UI (HelpBot, DailyAssistant restent identiques).
- Pas de schéma DB modifié.
- Pas de fine-tuning : les compétences sont injectées via prompt (suffisant pour GPT-5/Gemini).
- Pas de RAG/embeddings (la recherche à la demande couvre le besoin sans complexité supplémentaire).

## Validation

Tester avec chaque provider configuré (Lovable, OpenAI, Gemini) ces questions :
1. "Combien de SAV ouverts ai-je actuellement ?" → utilise les données.
2. "Comment réparer un iPhone 12 qui ne s'allume plus ?" → utilise les compétences techniques.
3. "Quelles pièces commander en priorité ?" → croise stock bas + commandes en cours + SAV en attente.
4. "Détaille le dossier SAV-2024-00042" → data lookup ciblé.
