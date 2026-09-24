# Corriger définitivement l’écart Tableau de bord / Rapports

## Diagnostic vérifié pour Easycash Agde

Sur septembre 2026, les deux écrans appliquent déjà la même règle aux SAV :

- **69 SAV comptés** selon les statuts et les réglages des types ;
- **CA SAV : 258,32 € HT** ;
- **coûts : 836,83 € HT** ;
- **marge SAV : −578,51 € HT**.

L’écart restant vient de **3 devis acceptés non transformés en SAV**, pour **359,98 € TTC / 299,98 € HT** :

- le Tableau de bord les ajoute au chiffre d’affaires ;
- la page Rapports ne charge actuellement que les SAV et ne les ajoute pas à ses totaux.

Cela explique exactement l’écart :

- **Rapports actuels : 258,32 € HT de CA, −578,51 € de marge** ;
- **Tableau de bord : 558,30 € HT de CA, −278,53 € de marge**.

Les types archivés sont bien chargés dans les deux calculs et ne causent pas cet écart.

## Correction

1. Ajouter aux Rapports les devis **acceptés et non transformés en SAV**, sur la période choisie dans le filtre.
2. Utiliser la règle financière commune existante pour convertir leur montant en HT/TTC.
3. Ajouter leur CA aux totaux du Rapport et à la marge, sans ajouter de coût de pièce inexistant.
4. Afficher un détail séparé « Devis acceptés non transformés » afin que le montant soit explicable et contrôlable, sans les mélanger aux lignes SAV.
5. Conserver les filtres de dates comme source unique de la période ; ne pas appliquer les filtres de type ou statut SAV aux devis.
6. Vérifier septembre pour Agde : le Tableau de bord et les Rapports doivent tous deux afficher **558,30 € HT de CA** et **−278,53 € HT de marge**, sous réserve qu’aucune donnée ne change entre les deux lectures.

## Périmètre technique

- Étendre `useReportData` pour charger les devis admissibles avec `fetchCountedQuotes` et les intégrer aux totaux.
- Étendre la page Rapports et ses exports pour présenter séparément le détail des devis comptés.
- Ajouter des tests de non-régression : devis accepté sans SAV compté, devis transformé exclu, devis hors période exclu, et égalité des totaux entre les deux parcours.
- Aucune migration de base de données n’est nécessaire.
