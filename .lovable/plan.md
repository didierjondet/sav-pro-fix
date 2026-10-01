# Parcours devis : acceptation client, transformation en SAV, temps réel, impression

## État constaté

- Quand le client accepte son devis depuis le lien SMS, le serveur enregistre bien « Accepté par le client » et crée une notification cloche pour le magasin.
- La page Devis possède déjà un onglet « Acceptés » avec un bouton « Valider » qui transforme le devis en SAV (validation humaine, donc déjà conforme au souhait).
- Le menu latéral compte déjà les devis acceptés par le client, mais ces compteurs ne se rafraîchissent pas en direct : la mise à jour en temps réel des devis semble inactive (la table n'est probablement pas abonnée au flux temps réel), d'où l'impression que « le devis reste en attente » tant qu'on ne recharge pas la page.
- Après la transformation en SAV, aucune impression ne se lance.

## Corrections prévues

1. **Temps réel des devis** : vérifier que la table des devis est bien diffusée en temps réel ; si ce n'est pas le cas, l'activer (petite migration technique). Résultat : dès que le client accepte depuis son SMS, la page Devis, la pastille du menu et la notification se mettent à jour sans rechargement.
2. **Statut et pastille** : s'assurer que le devis accepté par le client apparaît immédiatement dans l'onglet « Acceptés » avec le libellé « Accepté par client » et que la pastille du menu affiche le nombre de devis acceptés en attente de transformation.
3. **Impression à la transformation** : quand le magasin clique « Valider » et que le SAV est créé, lancer automatiquement l'impression du devis (comme pour les autres devis), en plus de la confirmation affichée.
4. **Vérification** : compilation + test du parcours complet (envoi SMS → acceptation client → apparition en direct côté magasin → validation → SAV créé + impression).

## Détails techniques

- Migration (si nécessaire) : `ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;` après vérification de `pg_publication_tables`.
- `src/pages/Quotes.tsx` : dans `convertQuoteToSAV`, après création du SAV, appeler l'impression du devis (`printQuote` de `src/lib/quoteActions.ts`).
- Aucun changement de règle de calcul ni de visibilité ; la validation humaine reste obligatoire (aucun SAV créé automatiquement).
