

## Plan : page Inventaire autonome accessible depuis le menu

### Objectif
Rendre l'inventaire accessible via une page dédiée `/inventory` au lieu d'un onglet de Réglages, et retirer l'onglet « Inventaire » de la page Réglages.

### Modifications

**1. Nouvelle page `src/pages/Inventory.tsx`**
- Page autonome avec `<Header />` + `<Sidebar />` (même structure que `Parts.tsx`, `Orders.tsx`)
- Contenu principal : `<InventoryManager canApplyStock={rolePermissions.inventory_apply_stock} />`
- Garde d'accès : si `rolePermissions.settings_inventory` est faux et utilisateur non super_admin → message « Accès non autorisé »
- Titre de page « Inventaire » + courte description

**2. `src/App.tsx`**
- Ajouter l'import `Inventory`
- Ajouter la route `<Route path="/inventory" element={<Inventory />} />`

**3. `src/components/layout/Sidebar.tsx`**
- Modifier l'entrée « Inventaire » : `href: '/inventory'` (au lieu de `/settings?tab=inventory`)
- Simplifier la détection `isActive` : retirer la logique spéciale `searchParams`, comparaison directe sur `location.pathname === '/inventory'`
- Conserver le filtrage de permission via `rolePermissions.settings_inventory` (case `'/inventory'` dans le switch)

**4. `src/pages/Settings.tsx`**
- Retirer l'import `InventoryManager`
- Retirer `'inventory'` de la liste `availableTabs`
- Retirer le `<TabsTrigger value="inventory">` (ligne ~767)
- Retirer le bloc `<TabsContent value="inventory">` (ligne ~1584)
- Si l'URL contient encore `?tab=inventory`, rediriger vers `/inventory` au montage (compatibilité ascendante)

### Comportements préservés
- Permissions RBAC `settings_inventory` et `inventory_apply_stock` inchangées (même clés en base)
- RLS sur `inventory_sessions` / `inventory_session_items` / `inventory_audit_logs` inchangées
- Vue simplifiée (`shop_admin`) : Inventaire reste masqué, comportement identique
- Onglet « Catégories de pièces » reste dans Réglages (inchangé)
- Aucune modification visuelle interne du `InventoryManager` lui-même

### Fichiers
- **Créé** : `src/pages/Inventory.tsx`
- **Modifié** : `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/pages/Settings.tsx`

### Vérifications
- Clic sur « Inventaire » dans la sidebar → ouverture de `/inventory` (page plein écran, sidebar conservée)
- L'item « Inventaire » est mis en surbrillance dans la sidebar
- L'onglet « Inventaire » n'apparaît plus dans Réglages
- Une URL `/settings?tab=inventory` redirige automatiquement vers `/inventory`
- Toutes les fonctionnalités existantes (lancer, suspendre, reprendre, annuler, valider, imprimer, filtrer par catégorie) restent fonctionnelles
- Aucune régression sur les autres pages

