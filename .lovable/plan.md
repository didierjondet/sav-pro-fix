
Plan corrigé après vraie vérification du flux.

Diagnostic confirmé
- Le QR code et la page publique fonctionnent bien.
- La base contient déjà des visites pour le dossier JAYMES :
  - dossier `a63a4538-cede-4e81-9ddd-2b108672d5ba`
  - slug `thomasjaym7913`
  - compteur réel en base: `3`
- Donc le problème n’est plus l’enregistrement de visite.
- Le problème restant est l’affichage du compteur dans `/sav`.

Pourquoi l’affichage est faux
- La liste SAV lit les visites directement depuis `sav_tracking_visits` côté client via `useSAVVisits`.
- Ce hook fait un `select('sav_case_id')` puis recompte en JavaScript.
- En cas de souci de RLS, de cache, de requête vide, ou de lecture partielle, le hook remplace silencieusement tout par `0`.
- Résultat: même quand la base contient bien des lignes, l’œil peut rester à `0`.

Ce que je vais changer
1. Remplacer la lecture directe par une vraie fonction SQL dédiée
- Créer une RPC `get_sav_visit_counts(p_sav_case_ids uuid[])`
- Fonction `SECURITY DEFINER`
- Elle retournera directement:
  - `sav_case_id`
  - `visit_count`
- Elle filtrera uniquement les dossiers du shop de l’utilisateur connecté (et super admin si besoin).
- Le comptage sera fait en SQL (`count(*) group by`) au lieu du front.

2. Corriger le hook `useSAVVisits`
- Ne plus lire `sav_tracking_visits` directement.
- Appeler la RPC `get_sav_visit_counts`.
- Retourner un vrai état d’erreur au lieu de masquer automatiquement par des zéros.
- Si la requête échoue: afficher une valeur neutre/placeholder plutôt qu’un faux `0`.

3. Garder la mise à jour temps réel
- Conserver l’écoute `INSERT` sur `sav_tracking_visits` dans `SAVList.tsx`
- Au nouvel événement, relancer `refetchVisits()`
- Cette fois le refetch ira vers la RPC agrégée, donc sur la bonne source.

4. Ne plus retoucher au tracking public
- Je ne modifierai plus `TrackSAV` ni les QR codes pour ce correctif.
- Les visites sont bien enregistrées; la preuve est déjà en base pour JAYMES.

Vérification prévue
- Ouvrir le dossier JAYMES comme cas test.
- Vérifier que la RPC retourne bien `3` pour `a63a4538-cede-4e81-9ddd-2b108672d5ba`.
- Vérifier que la card `/sav` affiche enfin `3`.
- Refaire un accès au lien public, puis vérifier que l’œil passe à `4` si une nouvelle visite est créée.

Fichiers concernés
- `supabase/migrations/...` : nouvelle RPC `get_sav_visit_counts`
- `src/hooks/useSAVVisits.ts` : migration du hook vers la RPC
- `src/pages/SAVList.tsx` : conserver le realtime mais refetch sur la nouvelle source

Détail technique
```text
QR code -> /track/:slug -> record_sav_visit()
                         -> INSERT sav_tracking_visits   (déjà OK)

Page /sav -> useSAVVisits()
          -> rpc(get_sav_visit_counts, [ids affichés])
          -> counts SQL fiables
          -> œil = vraie valeur
```

Point important
- J’ai vérifié la logique avant de proposer: il y a bien des visites en base pour JAYMES.
- Le prochain correctif doit donc viser uniquement la couche de lecture/affichage du compteur, pas la génération du QR ni la route publique.
