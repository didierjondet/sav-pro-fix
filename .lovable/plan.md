

## Diagnostic : Permissions de roles non appliquees correctement

### Problemes identifies

**1. Bug : `isAdmin` exclut `super_admin` (Settings.tsx ligne 641)**
```tsx
const isAdmin = profile?.role === 'admin'; // super_admin → false !
```
Quand un super_admin accede a Settings (sans impersonation), `isAdmin = false`. L'onglet "Utilisateurs" est masque car la condition est `isAdmin && rolePermissions.settings_users`.

**2. Absence de garde sur le chargement des permissions**
La page Settings verifie uniquement son `loading` local (qui depend de `fetchProfiles`), mais ne verifie pas si `rolePermissions` est charge. Pendant un bref instant, les permissions par defaut du role `technician` (fail-closed) sont utilisees — masquant temporairement les onglets.

**3. Verification base de donnees : tout est correct**
Les `shop_role_permissions` et `default_role_permissions` sont correctement configures dans la base. Pour Easycash Agde (admin) : `settings_users: true`, `settings_subscription: true`, `simplified_view_default: false`. Pour technician : `simplified_view_default: false` (configurable).

### Corrections

**Fichier 1 : `src/pages/Settings.tsx`**
- Corriger `isAdmin` pour inclure `super_admin` :
  ```tsx
  const isAdmin = profile?.role === 'admin' || actualProfile?.role === 'super_admin';
  ```
- Importer `actualProfile` depuis `useProfile`
- Ajouter la verification `rolePermissions` loading avant le rendu des onglets pour eviter le flash de permissions incorrectes

**Fichier 2 : `src/hooks/useRolePermissions.ts`** (optionnel)
- Aucun changement necessaire — la logique est correcte, les permissions de super_admin sont bien `ROLE_DEFAULTS.admin`

### Ce qui ne change pas
- La logique de `useRolePermissions` (deja correcte)
- Les donnees en base (deja correctes)
- Le `simplified_view_default` (fonctionne via le Header)
- Les autres pages

