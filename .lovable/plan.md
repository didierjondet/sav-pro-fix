
## Objectif

Lever la limite des 20 derniers SAV et donner à Fixy un accès complet à la base + renforcer son ADN de technicien réparateur hi-tech (priorité smartphone).

## Constat

Dans `supabase/functions/help-bot/index.ts` :
- `fetchShopData` n'expose que 10/20 SAV récents en dur, 15 pièces top, 30 pièces stock bas, etc. → l'IA ne « voit » jamais le reste.
- `performDataLookup` couvre quelques cas (numéro de dossier, nom client, type+modèle de pièce, RDV), mais l'IA ne peut pas demander activement plus.
- Le prompt technicien existe déjà mais reste secondaire dans le ton.

## Plan

### 1. Donner à Fixy un accès « illimité » via tool calling

Ajouter au edge function `help-bot` un mode **function calling** (OpenAI + Gemini) avec des outils typés qui interrogent la base à la demande, sur tout l'historique du shop :

- `search_sav_cases({ query?, status?, sav_type?, date_from?, date_to?, device_brand?, device_model?, imei?, customer?, limit })` — recherche full historique (pas de cap 20).
- `get_sav_case_detail({ case_number | id })` — fiche complète + pièces utilisées + messages + historique de clôtures + audit log.
- `search_parts({ query?, brand?, model?, type?, in_stock?, low_stock?, limit })` — toutes les pièces, prix achat/vente, marge, stock, fournisseur.
- `get_part_history({ part_id, days })` — historique d'usage en SAV, prix payés, fournisseurs.
- `search_customers({ query, limit })` + `get_customer_history({ customer_id })` — tous SAV/devis/RDV/messages.
- `search_quotes({ status?, date_from?, date_to?, query?, limit })`.
- `list_appointments({ date_from, date_to, status?, type? })`.
- `get_finance_summary({ period: 'today'|'week'|'month'|'year'|'custom', date_from?, date_to? })` — CA, marge, nombre SAV, taux retard, par type.
- `get_late_savs({ limit })` — uses business rules `is_final_status` + `pause_timer` + `max_processing_days` par type.
- `get_business_rules()` — renvoie statuts, types SAV, horaires boutique, configs IA modules, limites abonnement.
- `get_product_return_rate({ tracked_product_id? | imei? | sku? })` — réutilise `productReturnRate.ts` côté serveur.

Boucle d'appel : max 4 tours (l'IA appelle des tools → on renvoie les résultats → elle synthétise). Chaque tool exécute une requête SQL via service-role déjà strictement filtrée par `shop_id`, jamais d'input brut concaténé.

### 2. Réduire le contexte poussé en système, garder un « état du jour »

Le bloc « DONNÉES EN TEMPS RÉEL » devient un résumé compact (KPI shop, compteurs par statut, alertes stock, messages non lus, RDV 7 j, finance mois) — pas de listes longues. Les détails passent désormais par les tools, ce qui supprime la limite des 20 SAV sans gonfler le prompt.

### 3. Renforcer l'ADN « technicien réparateur hi-tech »

Refondre le `SYSTEM_PROMPT` :
- Identité d'ouverture : « Tu es Fixy, technicien réparateur hi-tech expert (spécialité smartphones) ET assistant Fixway. »
- Procédure de diagnostic devient centrale (interrogation client → tests → mesure conso → décision pièce/micro-soudure).
- Bibliothèque pannes/symptômes étendue par marque (iPhone Face ID/True Tone/Tristar, Samsung point bleu/refusion HDMI, Xiaomi Mi Flash, Pixel modem, Switch Joy-Con Hall, etc.).
- Règle de réflexe systématique : avant de chiffrer une réparation, appeler `search_parts` pour donner le prix réel de la boutique + marge, et `get_part_history` si dispo.
- Quand un IMEI/SKU est mentionné : appeler `get_product_return_rate` pour signaler récidive.
- Sortie type pour un diagnostic : *Symptômes probables → Tests à faire → Pièce(s) candidate(s) avec réf stock + prix → Temps estimé → Risques (True Tone, Face ID, étanchéité)*.

### 4. UI / contrat API : inchangé

Pas de modif côté `HelpBot.tsx` / `useHelpBot.ts`. Mêmes entrées (`message`, `history`, `userContext`, `shopId`), même sortie (`message`, `escalate`, `escalate_summary`).

### 5. Garde-fous

- Tools toujours filtrés par `shop_id` reçu (jamais depuis l'IA).
- Limites par tool (`limit` borné à 200) pour éviter d'exploser le contexte.
- Logs `[help-bot] tool=... rows=...` pour traçabilité.
- Retry 1× sur 429/503 (déjà standard dans le projet).

## Fichiers touchés

- `supabase/functions/help-bot/index.ts` — ajout tool calling + tools DB + refonte prompt + compactage du contexte poussé.

## Hors périmètre

- Pas de migration DB.
- Pas de changement UI du bot.
- Pas de changement des autres edge functions (daily-assistant reste tel quel).
