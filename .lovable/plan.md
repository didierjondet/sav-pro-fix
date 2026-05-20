# Corriger le macaron RDV sur les cartes SAV

Objectif : afficher de façon fiable le macaron rond sur une carte SAV dès qu'un rendez-vous actif est rattaché à ce SAV.

## Cause probable

Le rattachement RDV → SAV est bien enregistré via `appointments.sav_case_id`, mais le hook qui alimente les macarons (`useSAVAppointments`) filtre actuellement aussi par `customer_id` avec une requête `.or(...)`. Ce mélange peut empêcher la récupération fiable des rendez-vous rattachés, surtout après assignation ou selon les cas de données.

## Correctif prévu

1. `src/hooks/useSAVAppointments.ts`
   - Séparer la récupération en deux requêtes simples :
     - une requête par `sav_case_id` pour les RDV réellement rattachés au dossier SAV ;
     - une requête par `customer_id` uniquement pour l'ancien fallback client non rattaché.
   - Garder uniquement les RDV actifs/futurs (`proposed`, `confirmed`, `counter_proposed`).
   - Construire `appointmentsByCase` en priorité depuis `sav_case_id`, pour que le badge apparaisse dès qu'un RDV confirmé est rattaché au SAV.

2. `src/pages/SAVList.tsx`
   - Garder le rendu actuel du macaron rond, sans changer la carte ni les autres éléments validés.
   - Ne modifier que si nécessaire l'ordre de priorité : RDV rattaché au SAV d'abord, fallback client ensuite.

3. Validation
   - Vérifier que la requête des rendez-vous ne génère plus d'erreur et que le badge peut se baser sur `sav_case_id` après rattachement.

## Hors scope

- Pas de refonte de la carte SAV.
- Pas de changement visuel du macaron déjà créé.
- Pas de modification de la création/confirmation des rendez-vous.
- Pas de migration base de données.