# Switch « Compter dans les métriques » par statut SAV

## Concept
Chaque statut SAV reçoit un nouveau réglage `include_in_metrics` (booléen). Lorsqu'il est activé, les SAV portant ce statut sont comptés dans le tableau de bord, les rapports, les détails CA/dépenses, les widgets et statistiques mensuelles. Chaque magasin peut ainsi décider finement quels statuts entrent dans son chiffre d'affaires.

## Migration base de données
- Ajouter la colonne `include_in_metrics BOOLEAN NOT NULL DEFAULT false` sur `shop_sav_statuses`.
- Pré-remplissage : `UPDATE shop_sav_statuses SET include_in_metrics = true WHERE status_key IN ('ready', 'pret_et_cloture')` → tous les magasins existants gardent exactement leurs chiffres actuels (`ready` est déjà compté partout, `pret_et_cloture` n'existe que chez Agde).
- Trigger / seed des nouveaux magasins : lors de la création des statuts par défaut, `ready` est créé avec `include_in_metrics = true` (les autres restent `false`). Aucun changement sur la logique de clôture par défaut.

## UI — `src/components/sav/SAVStatusesManager.tsx`
Ajouter un Switch « Compter dans les métriques » à côté des switches existants (`pause_timer`, `is_final_status`, `show_in_sidebar`). Mêmes patterns visuels — pas de modification de mise en page.

## Hook source de vérité — `src/hooks/useShopSAVStatuses.ts`
Exposer un helper `getMetricsStatusKeys()` qui renvoie la liste des `status_key` où `include_in_metrics = true`.

## Refactor des filtres hardcodés
Remplacer partout `['ready', 'pret_et_cloture']` ajouté précédemment par la liste dynamique issue de `useShopSAVStatuses` :

- `src/hooks/useStatistics.ts` (READY_STATUSES ligne ~305, fallback ligne ~547)
- `src/hooks/useCustomWidgetData.ts` (lignes ~244, ~277)
- `src/hooks/useSAVPartsCosts.ts` (ligne ~109)
- `src/hooks/useMonthlyStatistics.ts` (lignes ~60, ~156) — devient `.in('status', metricsStatusKeys)`
- `src/pages/RevenueDetails.tsx` (ligne ~51)
- `src/pages/ExpensesDetails.tsx` (ligne ~50)
- `src/pages/Reports.tsx` (ligne 35) — pré-sélection = `metricsStatusKeys` du magasin courant
- `src/components/sav/SAVDashboard.tsx` (ligne ~188) — lien filtré sur la liste

**Fallback de sécurité** : si la requête n'a pas encore chargé ou si aucun statut n'est marqué, on retombe sur `['ready', 'pret_et_cloture']` pour ne jamais montrer un tableau vide.

## Hors-scope (inchangé)
- `is_final_status` reste indépendant (utilisé pour stopper les compteurs de retard).
- `daily-assistant` continue d'utiliser `['ready','pret_et_cloture']` car c'est un service serveur non lié à la configuration UI par magasin.
- Aucune modification des labels, couleurs, ordre d'affichage ou autres réglages existants.

## Garanties pour les autres magasins
Après migration : `ready` est marqué `include_in_metrics = true` partout → comportement strictement identique à aujourd'hui. Aucun chiffre ne bouge. Seul Agde voit en plus `pret_et_cloture` compté (ce qui est déjà le cas depuis le dernier déploiement).

## Validation
1. Magasin standard : tableau de bord affiche les mêmes chiffres qu'avant.
2. Agde : tableau de bord affiche `ready` + `pret_et_cloture`, identique à maintenant.
3. Désactiver le switch sur `ready` pour un magasin test → ses chiffres tombent à 0, preuve que la logique est bien pilotée par le réglage.
