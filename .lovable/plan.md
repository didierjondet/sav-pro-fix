## Contexte et principes directeurs

Fixway est un SaaS multi-boutiques avec un mix complexe d'accès :
- Utilisateurs **authentifiés** (admins, techniciens, shop_admin, super_admin)
- **Clients particuliers non authentifiés** qui accèdent via des tokens/slugs publics (suivi SAV, devis, satisfaction, RDV)
- **Edge functions** qui utilisent le `service_role` (SMS, emails, etc.)

Les corrections passées ont cassé :
1. Le **suivi SAV public** (clients non logués qui ne peuvent plus voir leur dossier / envoyer un message)
2. L'**envoi de SMS** (RLS qui bloque l'insert dans `sms_history` ou `sav_messages` depuis l'edge function)

**Règles d'or pour ce chantier :**
- Une faille = une migration isolée, testable et réversible
- Toujours créer une **RPC SECURITY DEFINER** scopée par token avant de durcir une policy publique (jamais l'inverse)
- Les edge functions utilisent déjà `service_role` → elles bypassent RLS, donc durcir RLS ne casse PAS les SMS si on ne touche pas au code des functions
- Aucune modif en parallèle : on attend ta validation visuelle entre chaque étape
- Garder le rollback prêt (SQL inverse fourni avant chaque migration)

---

## Cartographie des 7 failles critiques

| # | Faille | Risque réel | Risque de casse |
|---|--------|-------------|------------------|
| 1 | `appointments` lecture publique totale | Élevé (fuite RGPD multi-boutiques) | Moyen — page `/rdv/:token` |
| 2 | `appointments` update publique non scopée | Élevé (n'importe qui modifie tout RDV) | Moyen — confirmation client |
| 3 | `satisfaction_surveys` lecture publique totale | Élevé (95 enquêtes exposées) | Faible — page `/satisfaction/:token` |
| 4 | `sav_messages` lecture publique via tracking_slug deviné | Moyen-élevé | **ÉLEVÉ** — c'est ici que ça a cassé avant |
| 5 | `subscribers` update non scopée | Critique (changer son tier !) | Très faible |
| 6 | `sav-attachments` storage insert/delete trop large | Moyen (cross-shop) | Faible si on garde les policies folder-scopées |
| 7 | Realtime sans autorisation de canal | Moyen (écoute cross-shop) | **ÉLEVÉ** — peut casser toutes les souscriptions live |

Les warnings (Postgres version, OTP expiry, search_path mutable, bucket listing, function executable) sont à traiter en **phase 4**, sans urgence et sans risque applicatif.

---

## Plan en 4 phases (à valider une par une)

### Phase 1 — Quick wins sans risque utilisateur (faille #5 + #6)

**Faille #5 — `subscribers` update non scopée**
- Remplacer `USING (true)` par `USING (user_id = auth.uid() OR email = auth.email())`
- **Aucun impact** : la page subscription lit/écrit déjà sur sa propre ligne
- Rollback : 1 ligne SQL

**Faille #6 — Storage `sav-attachments`**
- Supprimer les 2 policies trop larges (`Users can upload sav attachments` + `Users can delete their own sav attachments`)
- Les policies folder-scopées (`<shop_id>/...`) existent déjà et continueront de fonctionner
- À vérifier en amont : confirmer par lecture des policies actuelles qu'un fallback folder-scopé couvre bien upload + delete pour `authenticated`
- Test après migration : un technicien upload une pièce jointe dans un SAV de sa boutique

**Validation requise avant Phase 2** : tu confirmes que pièces jointes SAV et page abonnement marchent normalement.

---

### Phase 2 — Pages publiques (failles #1, #2, #3) — risque modéré

Pour chacune : **on crée d'abord une RPC SECURITY DEFINER** qui prend le token en paramètre et renvoie/modifie la seule ligne correspondante. Le frontend bascule sur la RPC. **Seulement après** on durcit la policy publique.

**Faille #3 — `satisfaction_surveys` (plus simple, on commence par là)**
1. Migration A : créer `get_satisfaction_survey_by_token(token text)` + `submit_satisfaction_survey(token, rating, comment)`
2. Modifier `src/pages/Satisfaction.tsx` pour utiliser les RPC
3. Migration B (après validation visuelle) : remplacer la policy publique par `false` (ou la supprimer)

**Faille #1 + #2 — `appointments`**
1. Migration A : créer `get_appointment_by_token(token uuid)` + `respond_to_appointment_proposal(token, action, counter_datetime)`
2. Modifier `src/pages/AppointmentConfirm.tsx`
3. Migration B : durcir les policies publiques

**Validation requise** : tester `/satisfaction/:token`, `/rdv/:token`, confirmation + contre-proposition.

---

### Phase 3 — Suivi SAV client (faille #4) — risque ÉLEVÉ, à isoler

C'est la zone qui a cassé l'an dernier. On va donc **changer le moins possible** et garder le pattern RPC qui existe déjà :
- `get_tracking_messages(p_tracking_slug)` — déjà SECURITY DEFINER ✅
- `send_client_tracking_message(...)` — déjà SECURITY DEFINER ✅
- `record_sav_visit(...)` — déjà SECURITY DEFINER ✅

**Stratégie :**
1. Audit complet de `src/pages/TrackSAV.tsx` + `SimpleTrack.tsx` + tout composant client public pour identifier chaque requête directe vers `sav_messages` / `sav_cases` qui pourrait casser
2. Pour chaque requête directe restante, créer une RPC dédiée et migrer le frontend
3. **Seulement quand 100% du frontend public passe par des RPC**, durcir la policy `Unified view messages policy`
4. Garder la policy `INSERT` côté edge function intacte (le service_role bypasse RLS de toute façon → **les SMS et messages serveur ne seront pas impactés**)

**Pourquoi les SMS ne casseront pas** : l'edge function `send-sms` insère dans `sms_history` et `sav_messages` via le client Supabase avec `SUPABASE_SERVICE_ROLE_KEY` (visible dans `supabase/functions/send-sms/index.ts`). Le service_role ignore RLS. Le scénario de casse précédent venait probablement d'un changement côté frontend, pas côté policy.

**Validation longue requise** : 24-48h d'usage en prod avant Phase 4.

---

### Phase 4 — Realtime + warnings (faille #7 et reste)

**Faille #7 — Realtime channels**
- Le plus risqué pour ton usage quotidien (notifications live, messages SAV, etc.)
- À traiter en dernier, avec une fenêtre de maintenance
- Solution : RLS sur `realtime.messages` scopée par topic contenant le `shop_id`
- Prérequis : auditer **tous** les `supabase.channel('...')` du codebase pour renommer les topics en `shop:<shop_id>:...`
- Sous-étape testable : on liste d'abord tous les canaux, on propose une convention, tu valides, puis migration

**Warnings restants (low priority)**
- Postgres version : upgrade depuis le dashboard Supabase (toi, en dehors du chat)
- OTP expiry : réglage dashboard auth
- `search_path mutable` : revue des fonctions, ajout `SET search_path = public`
- `public_bucket_allows_listing` : restreindre policy SELECT du bucket public
- `security_definer_function_executable` : revoke EXECUTE sur les fonctions non publiques

---

## Ce que je propose comme prochaine action

Démarrer par la **Phase 1** (faille #5 + #6) car :
- Aucun impact sur tes clients particuliers
- Aucun impact sur les SMS
- Rollback trivial
- Te permet de valider le processus de travail avant d'attaquer les zones sensibles

Si tu valides ce plan général, je rédige la migration précise de la Phase 1 (avec le SQL de rollback) dans un prochain message, tu la valides, on l'exécute, tu testes en prod, puis on enchaîne sur la Phase 2.

**Confirme-moi :**
1. OK pour démarrer par la Phase 1 ?
2. Une préférence pour traiter `satisfaction_surveys` avant `appointments` en Phase 2 (ordre du moins risqué au plus risqué) ?
