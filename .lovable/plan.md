# Indicateur RDV sur les cartes SAV

Ajouter sur les cartes de la liste SAV un badge visible lorsqu'un rendez-vous est programmé pour le dossier (vue standard et vue compacte).

## Comportement

- Pour chaque SAV affiché, on cherche le **prochain RDV actif** :
  - `appointments.sav_case_id = savCase.id`
  - `status` ∈ (`proposed`, `confirmed`, `counter_proposed`) — on exclut `cancelled`, `completed`, `no_show`
  - `start_datetime >= now()`
  - on garde le plus proche dans le temps.
- Si un RDV existe → afficher un badge sur la carte.

## Affichage du badge

Vue standard (ligne Métadonnées, à côté des badges existants) :
- Icône `Calendar` + libellé court : `RDV jeu. 21 mai 14h30`
- Couleur dépendant du statut :
  - `confirmed` → vert (bg-green-100 text-green-700 border-green-200)
  - `proposed` / `counter_proposed` → ambre (bg-amber-100 text-amber-700 border-amber-200)
- Tooltip : type de RDV (Dépôt / Récupération / Diagnostic / Réparation) + durée.

Vue compacte (sous la ligne appareil) :
- Petit badge compact `text-[10px]` même couleur, format `RDV 21/05 14h30`.

## Détails techniques

1. Nouveau hook `src/hooks/useSAVAppointments.ts`
   - Input : `savCaseIds: string[]`
   - Query Supabase unique : `from('appointments').select('id, sav_case_id, start_datetime, duration_minutes, appointment_type, status').in('sav_case_id', ids).in('status', ['proposed','confirmed','counter_proposed']).gte('start_datetime', nowIso).order('start_datetime', { ascending: true })`
   - Réduction côté client en `Map<sav_case_id, nextAppointment>` (premier rencontré = le plus proche).
   - `enabled: ids.length > 0`, `staleTime: 60_000`.

2. `src/pages/SAVList.tsx`
   - Importer le hook + `Calendar` (déjà dispo dans lucide-react).
   - `const { appointmentsByCase } = useSAVAppointments(savCaseIds);` (réutilise le `savCaseIds` déjà calculé ligne 179).
   - Dans le rendu compact : insérer le badge entre la ligne appareil et la ligne badge type, uniquement si présent.
   - Dans le rendu standard : insérer le badge dans le bloc "Ligne 3 : Métadonnées" après les autres badges, uniquement si présent.
   - Pas de modification de logique métier, juste de la présentation.

## Hors scope

- Pas de changement sur la page agenda, ni sur `AppointmentDisplay` du suivi public.
- Pas de modification des hooks existants `useAppointments` / `usePendingAppointments`.
- Pas de clic / navigation depuis le badge (peut être ajouté ultérieurement si demandé).
