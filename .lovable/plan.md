# Chiffres incohérents Tableau de bord / Rapports (Easycash Agde)

## Constat (vérifié en base, septembre 2026)
- Aucune valeur perdue : les SAV restent rattachés à leur type. Les 2 types archivés (Estally, Slim) n'ont que 3 dossiers « en attente » à 0 €. La piste « types supprimés » n'explique pas l'écart.
- Ce mois-ci : 18 SAV clients clôturés (2 538,94 € de total), 8 externes clôturés (309,99 €), 43 internes clôturés (2 880,90 € de coût).
- Le Tableau de bord et les Rapports ne comptent pas de la même façon. Au moins 5 calculs séparés existent (widgets du tableau de bord, page Rapports, statistiques mensuelles, détail CA/dépenses, assistant du jour, super admin). Ils diffèrent sur :
  - les statuts retenus (clôturés seulement ou tous) ;
  - la prise en compte des SAV internes (coût seulement ou non) ;
  - l'ajout, ou non, des devis acceptés au CA (source probable de doublons, un devis converti en SAV étant compté deux fois) ;
  - HT ou TTC ;
  - le prix utilisé (prix figé du SAV ou prix actuel du catalogue) ;
  - les options d'exclusion par type de SAV (réglages des types).

## Ce qui sera fait
1. **Audit chiffré** : recalcul du mois pour Agde, poste par poste, avec chaque méthode. On identifie la cause exacte de 3 713,92 € contre 333,32 €. Je vous présente ensuite le détail avant de figer les règles.
2. **Une seule règle de calcul, pour tout le logiciel** :
   - SAV comptés : statut final marqué « inclus dans les statistiques » ;
   - le type de SAV décide : CA compté ou non, coûts comptés ou non (réglages existants des types), archivés inclus pour l'historique ;
   - CA = prix de vente HT des pièces, moins la prise en charge (totale ou partielle) ;
   - Coût = prix d'achat HT figé dans le SAV ;
   - Marge = CA − coût ;
   - devis acceptés : ajoutés seulement s'ils ne sont pas déjà devenus un SAV.
3. **Brancher tous les écrans sur cette règle** : widgets du tableau de bord, Rapports, pages de détail CA/dépenses, comparaison mensuelle, assistant du jour et statistiques super admin.
4. **Vérification** : mêmes chiffres pour Agde sur le tableau de bord et dans les Rapports, pour le même mois.

## Questions à trancher après l'audit
- Faut-il ajouter au CA les devis acceptés non transformés en SAV ?
- Le mois retenu pour un SAV : date de création ou date de clôture ?

## Détails techniques
- Nouveau module `src/lib/savFinance.ts` : `computeSavFinance(cases, types, statuses, vatRate)`, fonction pure avec tests.
- Remplacement des calculs dans `useStatistics.ts`, `useReportData.ts`, `useMonthlyStatistics.ts`, `useSAVPartsCosts.ts`, `RevenueDetails.tsx`, `ExpensesDetails.tsx`, `DailyAssistant`, `useCustomWidgetData.ts` et les stats SuperAdmin.
- Types résolus via `allTypes` (actifs et archivés), jamais via le code en dur `'internal'` / `'client'`.
- Aucune migration prévue.
