Objectif : supprimer les deux comportements interdits sur le dashboard : widgets coupés et widgets qui passent au-dessus d’autres widgets, sans changer la logique métier ni le reste de l’interface.

Plan d’intervention :

1. Stabiliser la grille du dashboard
- Retirer le placement dense `[grid-auto-flow:dense]`, car il peut repositionner les widgets dans les trous et accentuer les superpositions visuelles avec le drag/drop.
- Garder une grille simple et prévisible : 1 colonne mobile, 2 colonnes tablette, 4 colonnes desktop.
- Augmenter légèrement l’espacement entre widgets pour garantir une séparation visuelle constante.

2. Remplacer les hauteurs trop rigides par des hauteurs minimales sûres
- Ne plus forcer tous les widgets à tenir strictement dans une hauteur trop courte.
- Conserver les proportions imposées par gabarit, mais utiliser des `min-height` responsives plutôt qu’un `h-full` qui coupe le contenu.
- Les widgets pourront donc grandir si leur contenu réel est plus haut, au lieu de chevaucher ou devenir illisibles.

3. Corriger le wrapper commun `SortableBlock`
- Retirer le `overflow-hidden` au niveau du bloc principal, qui masque encore des informations.
- Ajouter une isolation/z-index propre pour éviter qu’un widget normal passe au-dessus d’un autre.
- Garder un z-index élevé uniquement pendant le glisser-déposer.

4. Uniformiser les cartes internes des widgets principaux
- Appliquer `h-full min-h-0 flex flex-col` aux widgets qui contiennent graphiques, listes ou plusieurs sections.
- Adapter les zones de graphiques pour qu’elles utilisent l’espace disponible sans pousser la carte hors de sa case.
- Cibler uniquement les widgets du dashboard concernés : KPIs financiers, comparaison mensuelle, répartition CA, satisfaction client, performance SAV, stats annuelles, retards mensuels, stockage/devis/top appareils si nécessaire.

5. Ajuster les widgets très chargés
- Les widgets comme `revenue-breakdown`, `customer-satisfaction`, `top-devices`, `annual-stats` et `monthly-comparison` auront un gabarit plus haut si leur contenu ne tient pas.
- Le but est de voir 100% des informations, pas de forcer une compression illisible.

6. Vérification ciblée
- Vérifier le comportement sur la largeur actuelle 971×696, puis sur mobile et desktop.
- Confirmer visuellement qu’aucun widget n’est coupé et qu’aucun ne chevauche un autre.