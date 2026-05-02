## Constat

- Les boutons écrivent bien une action dans le journal, mais la ligne de session reste parfois `pending` avec `counted_quantity = null`.
- Le stock réel (`parts.quantity`) n’est modifié que par la fonction SQL `apply_inventory_session`, appelée par le bouton **Appliquer le stock**. Les boutons vert/rouge/ajuster ne doivent modifier que `inventory_session_items`.
- Il faut rendre cette séparation plus sûre et plus visible : **comptage/clôture = préparation**, **application finale = écrasement irréversible du stock**.

## Plan de correction

1. **Sécuriser l’enregistrement des lignes d’inventaire**
   - Remplacer l’update direct côté frontend par une fonction SQL dédiée, par exemple `set_inventory_session_item_count`.
   - Cette fonction mettra à jour uniquement la ligne de session : `counted_quantity`, `line_status`, `entry_method`, `notes`, `counted_at`.
   - Elle refusera toute modification si la session est déjà `completed`, `applied` ou `cancelled`.
   - Elle recalculera les totaux de session juste après l’enregistrement.

2. **Corriger le bouton vert et le bouton rouge**
   - **Valider** : enverra la quantité théorique dans la ligne d’inventaire, donc la zone **Comptée** affichera `1` pour cette pièce et la puce passera à **Traité**.
   - **Non trouvé** : enverra `0`, donc la zone **Comptée** affichera `0` et la puce passera à **Non trouvé** / traité comme ligne traitée.
   - **Ajuster** : enverra la quantité saisie manuellement et passera la ligne en **Ajusté** si elle diffère du théorique.

3. **Synchroniser immédiatement l’interface**
   - Après chaque action, rafraîchir explicitement la session et ses lignes depuis Supabase.
   - Corriger l’état local des champs pour éviter qu’un brouillon masque la donnée réelle.
   - Ajouter un petit rafraîchissement optimiste local pour que la carte change immédiatement, puis confirmer avec les données serveur.

4. **Clarifier les libellés pour éviter la peur de modifier le stock**
   - Modifier les toasts des boutons de comptage : remplacer “en stock” par “compté dans l’inventaire”.
   - Renommer/clarifier la zone finale : **Clôturer le comptage** ne modifie pas le stock, elle fige la session.
   - Garder **Appliquer le stock** comme seule action qui écrase réellement les quantités, avec confirmation irréversible.

5. **Vérifier l’application finale du stock**
   - Confirmer dans le code que seul `apply_inventory_session` modifie `parts.quantity`.
   - Si besoin, renforcer la fonction SQL pour n’accepter l’application que sur une session `completed`, sans lignes `pending`, et jamais pendant le comptage.

6. **Conserver les impressions / archives existantes**
   - Les boutons d’impression existants seront conservés pour imprimer la synthèse, les manquants et la feuille papier depuis les sessions historisées.
   - Je ne refais pas toute la partie archive maintenant, sauf si nécessaire pour ne pas casser le correctif principal.

## Fichiers concernés

- `src/hooks/useInventory.ts`
- `src/components/settings/inventory/InventoryManager.tsx`
- `src/components/settings/inventory/InventoryManualEditor.tsx`
- Migration Supabase pour la fonction sécurisée d’enregistrement des lignes

## Résultat attendu

- La pièce “connecteur de charge iPhone 12 Pro Max” passe bien de **À traiter** à **Traité** après le bouton vert.
- La zone **Comptée** affiche bien la quantité validée (`1`) ou `0` avec **Non trouvé**.
- Aucun stock réel n’est modifié avant l’action finale **Appliquer le stock**.