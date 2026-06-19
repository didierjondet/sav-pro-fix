## Étape 4 — Sécurisation de `sav_messages` (mode prudent)

### Contexte de risque
Cette zone a déjà causé la perte d'accès à des SAV par le passé. Le plan ci-dessous est donc volontairement **non destructif** et **réversible**.

### Problème actuel
Les politiques RLS de `sav_messages` accordent un accès **anonyme total** (SELECT / INSERT / UPDATE / DELETE) dès qu'un SAV possède un `tracking_slug` (donc tous). Aucune vérification du slug n'est faite — un UUID de message ou de SAV suffit à lire, écrire ou supprimer.

Politiques concernées :
- `Clients can insert messages via tracking` (INSERT anon)
- `Unified view messages policy` — branche anon (SELECT)
- `Unified update messages policy` — branche anon (UPDATE)
- `Unified delete messages policy` — branche anon (DELETE)

### Pourquoi c'est sûr de les retirer
Le frontend public passe **déjà** par des RPC `SECURITY DEFINER` qui valident le slug :
- Lecture publique : `get_tracking_messages(p_tracking_slug)`
- Envoi public : `send_client_tracking_message(p_tracking_slug, …)`

Les seuls appels anon directs restants dans le code sont `markAsRead` / `markAllAsRead` côté client public (mise à jour du flag « lu »). On les remplace par une nouvelle RPC dédiée.

### Migration SQL (réversible)
1. `DROP POLICY "Clients can insert messages via tracking" ON public.sav_messages`
2. `DROP POLICY "Unified view messages policy" ON public.sav_messages` puis recréer une version **authenticated-only** (branche anon retirée). Idem pour `Unified update messages policy` et `Unified delete messages policy`.
3. `CREATE OR REPLACE FUNCTION public.mark_tracking_messages_read(p_tracking_slug text)` en `SECURITY DEFINER` : passe `read_by_client = true` sur les messages `sender_type = 'shop'` du SAV correspondant au slug. `GRANT EXECUTE TO anon, authenticated`.

Aucune donnée n'est touchée. Aucune table, colonne, ou ligne n'est supprimée/modifiée. Seules des politiques RLS sont remplacées et une fonction est ajoutée.

### Plan de rollback explicite
Si quoi que ce soit casse l'accès aux SAV ou aux messages :
- **Option 1 (immédiate)** : utiliser le bouton « Revert » sous le message Lovable qui aura appliqué la migration → restauration intégrale de la version précédente.
- **Option 2 (SQL)** : la migration de rollback est triviale — recréer à l'identique les 4 politiques d'origine (le SQL exact sera inclus en commentaire dans le fichier de migration pour copier/coller en un clic dans l'éditeur SQL Supabase).

Aucun `DROP TABLE`, `DROP COLUMN`, `DELETE` ou `TRUNCATE` n'est utilisé → un rollback restaure 100 % du comportement.

### Modifications frontend
- `src/hooks/useMessaging.ts` :
  - Quand `userType === 'client'`, `markAsRead` et `markAllAsRead` appellent `mark_tracking_messages_read` au lieu d'`UPDATE` direct.
  - Comportement côté shop authentifié **inchangé**.
- Aucun autre fichier modifié (les hooks shop `useSAVMessages.ts`, etc. tournent en authentifié → toujours OK).

### Vérification post-migration
1. Côté shop authentifié : ouvrir un SAV, lire/envoyer/supprimer un message → OK.
2. Côté public `/track/...` : ouvrir un tracking, voir l'historique, envoyer un message, voir le badge « non lu » disparaître côté shop.
3. Relancer le scan de sécurité → confirmer la disparition des alertes liées à `sav_messages`.

Je n'enchaîne **pas** l'étape suivante : après application, j'attends ta validation explicite avant de toucher à autre chose.