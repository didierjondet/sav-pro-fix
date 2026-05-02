## Plan de correction inventaire

### Objectifs fonctionnels
1. **Bouton Valider en vue standard**
   - Quand on appuie sur **Valider**, copier immédiatement la quantité théorique/attendue dans le champ de correction de la ligne.
   - Enregistrer en même temps cette quantité attendue avec le statut `found`.
   - Garder le comportement **Non trouvé** = quantité `0`, statut `missing`.
   - Garder le comportement **Ajuster** = quantité saisie manuellement, statut `found/missing/adjusted` selon l’écart.

2. **Actions qui ne semblent pas fonctionner**
   - Ajouter un état d’enregistrement par ligne pour empêcher les doubles clics et rendre l’action visible.
   - Nettoyer les brouillons locaux après succès pour que l’interface reflète les données fraîches.
   - Afficher une erreur si Supabase refuse la mise à jour au lieu d’avoir un bouton qui semble inactif.

3. **Mode assisté sans boucle**
   - Ne plus se baser sur `currentIndex` après mutation avec une liste potentiellement obsolète.
   - Utiliser le résultat réel de `updateItem/markItemMissing` retourné par le hook (`freshItems`) pour calculer le prochain produit.
   - Après la dernière pièce, afficher 100% et clôturer proprement le comptage.
   - À la clôture depuis le mode assisté : fermer la fenêtre et revenir sur la page générale/liste d’inventaire au lieu de repartir au début.

4. **Progression synchronisée**
   - Calculer la barre uniquement depuis la liste d’items fraîche après chaque validation.
   - Afficher limites claires : total, traité, restant, position.
   - Quand toutes les lignes sont traitées : progression = 100%, plus aucune navigation vers le premier produit.

5. **Vue smartphone/tablette**
   - Remplacer l’expérience type tableau par des cartes compactes sur mobile/tablette.
   - Garder une version plus dense sur desktop si utile, mais avec les mêmes 3 actions principales.
   - Boutons larges, tactiles, et ordre clair : **Valider**, **Non trouvé**, **Ajuster**.
   - Notes intégrées dans la carte et enregistrées avec l’action, sans bouton de sauvegarde séparé.

### Fichiers à modifier
- `src/hooks/useInventory.ts`
  - Sécuriser le retour de `updateItem`, `markItemMissing`, `closeSession` pour fournir les données fraîches utilisables par l’UI.

- `src/components/settings/inventory/InventoryManager.tsx`
  - Corriger les handlers `Valider`, `Non trouvé`, `Ajuster`.
  - Mettre à jour les champs locaux après action.
  - Brancher correctement le retour `freshItems` vers le mode assisté.
  - Fermer le mode assisté et revenir à la liste générale après fin/clôture.

- `src/components/settings/inventory/InventoryAssistedDialog.tsx`
  - Refaire la logique d’avancement pour ne jamais reboucler sur le début.
  - Verrouiller les actions pendant l’enregistrement.
  - Afficher l’état final 100% avant clôture, puis clôturer/revenir à la liste.

- `src/components/settings/inventory/InventoryManualEditor.tsx`
  - Refonte responsive en cartes mobiles/tablettes.
  - Boutons simplifiés avec état loading par ligne.
  - Valider copie aussi la quantité attendue dans le champ visible.

### Points de vigilance
- Pas de changement de structure Supabase prévu.
- Ne pas toucher aux autres modules SAV/devis/commandes.
- Conserver les statuts existants (`pending`, `found`, `missing`, `adjusted`) pour ne pas casser l’application finale du stock.