# Chiffres incohérents Tableau de bord / Rapports (Easycash Agde)

## Constat (vérifié en base, septembre 2026)
- Aucune valeur perdue : les SAV restent rattachés à leur type. Agde a 12 types archivés, qui regroupent 140 dossiers sur l'historique (environ 4 530 €, surtout Estally 2 654 € et Slim 1 220 €). Pour septembre, ils ne pèsent presque rien : 3 dossiers à 0 €. Ils n'expliquent donc pas l'écart de ce mois, mais ils doivent rester comptés pour les mois passés.
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

## Règles validées
- Devis acceptés : comptés uniquement s'ils n'ont pas été transformés en SAV.
- Période : c'est toujours le filtre de dates choisi qui décide (filtre de la page Rapports, réglage de chaque widget). Le calcul commun reçoit cette période et ne fixe aucune date lui-même.

## Détails techniques
- Nouveau module `src/lib/savFinance.ts` : `computeSavFinance(cases, types, statuses, vatRate)`, fonction pure avec tests.
- Remplacement des calculs dans `useStatistics.ts`, `useReportData.ts`, `useMonthlyStatistics.ts`, `useSAVPartsCosts.ts`, `RevenueDetails.tsx`, `ExpensesDetails.tsx`, `DailyAssistant`, `useCustomWidgetData.ts` et les stats SuperAdmin.
- Types résolus via `allTypes` (actifs et archivés), jamais via le code en dur `'internal'` / `'client'`.
- Aucune migration prévue.
