
Objectif: corriger vraiment le compteur de visites des dossiers SAV pour que le dossier JAYMES incrémente bien après un scan/accès QR.

Constat après lecture du code
- L’enregistrement de visite existe bien dans `src/pages/TrackSAV.tsx` et aussi dans `src/pages/SimpleTrack.tsx` via `supabase.rpc('record_sav_visit', ...)`.
- Mais la route active du tracking public est `src/App.tsx` → `/track/:slug` vers `TrackSAV`, pas `SimpleTrack`.
- Le compteur affiché sur la page SAV vient de `src/hooks/useSAVVisits.ts`, qui lit `sav_tracking_visits` une seule fois au chargement.
- La liste SAV (`src/pages/SAVList.tsx`) se met en temps réel uniquement sur `sav_cases`, jamais sur `sav_tracking_visits`.
- Donc même si la visite est bien enregistrée, l’œil peut rester à `0` tant que la liste n’est pas rechargée.
- Deuxième point à sécuriser: `record_sav_visit` déduplique sur `visitor_ip`, mais le front envoie toujours `null`. Avec cette logique, plusieurs visites récentes anonymes peuvent être mal comptées. Il faut fiabiliser le mécanisme.

Plan de correction
1. Fiabiliser la source du problème côté affichage
- Modifier `src/pages/SAVList.tsx` pour écouter aussi les insertions sur `public.sav_tracking_visits`.
- Au lieu de ne refetch que sur `sav_cases`, déclencher aussi un refresh des visites quand une visite est insérée.
- Si possible, utiliser directement `refetch` du hook `useSAVVisits` pour éviter de recharger toute la liste des SAV.

2. Rendre le hook de visites plus robuste
- Mettre à jour `src/hooks/useSAVVisits.ts` pour exposer clairement `refetch`.
- Ajouter une garde pour éviter les faux `0` pendant le chargement.
- Option recommandée: remplacer le comptage côté front par une requête agrégée ou un RPC dédié si le schéma actuel/RLS rend certains résultats instables.

3. Corriger la logique de déduplication des visites
- Vérifier la migration/table `sav_tracking_visits` et la fonction SQL `record_sav_visit`.
- Problème actuel probable: comme `p_visitor_ip` vaut `null`, la déduplication par IP devient incohérente pour le cas public.
- Corriger la fonction pour dédupliquer sur une combinaison plus fiable, par exemple:
  - `visitor_ip` si disponible
  - sinon `visitor_user_agent` + `tracking_slug` + fenêtre de temps
- Cela évite qu’une visite publique valide ne soit ignorée ou mal comptée.

4. Vérifier le lien QR réellement utilisé
- Harmoniser le tracking pour que le QR imprimé, le QR affiché et la page publique pointent tous vers la même route publique fonctionnelle.
- Conserver `TrackSAV` comme source principale si c’est la route réellement branchée.
- Éviter d’avoir deux pages de tracking parallèles si une seule est utilisée en production.

5. Résultat attendu
- Quand un client scanne le QR code du dossier JAYMES et ouvre la page de suivi, une ligne est bien enregistrée dans `sav_tracking_visits`.
- La liste SAV se met à jour sans rechargement manuel, et l’icône œil passe de `0` à `1`.
- Les visites suivantes sont comptées de façon cohérente, sans doublons abusifs ni blocage lié au `null` IP.

Fichiers concernés
- `src/pages/SAVList.tsx`
- `src/hooks/useSAVVisits.ts`
- `src/pages/TrackSAV.tsx` (vérification légère / harmonisation)
- `src/pages/SimpleTrack.tsx` (soit alignement, soit nettoyage de doublon)
- `supabase/migrations/...` pour ajuster `record_sav_visit` si nécessaire

Détail technique
```text
QR code -> /track/:slug -> TrackSAV
                    -> RPC record_sav_visit()
                    -> INSERT sav_tracking_visits
                    -> SAVList écoute sav_tracking_visits
                    -> useSAVVisits.refetch()
                    -> compteur œil mis à jour
```

Point important
- Vu votre symptôme précis (“je me connecte avec le QR code mais l’œil reste à 0”), la correction la plus probable et la plus urgente est l’absence de rafraîchissement temps réel du compteur dans `SAVList`.
- Mais je prévois aussi la correction SQL de `record_sav_visit` pour éviter que le problème revienne selon les appareils ou sessions publiques.
