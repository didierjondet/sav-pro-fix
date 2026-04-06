

## Plan révisé : Système de permissions par rôle utilisateur

### Les 3 rôles concernés et leurs valeurs par défaut

**1. Admin** (accès complet par défaut) :
- Tous les menus : activés
- Réglages : accès complet
- Vue simplifiée : non activée par défaut
- Logs SAV, suppression SAV, gestion stock, création devis : tout activé
- Abonnement et achat SMS : **activé** (réservé aux admins)

**2. Technicien** :
- Menus : Tableau de bord, Dossiers SAV, Stock pièces, Devis, Commandes, Clients, Agenda, Chat clients → activés
- Rapports, Statistiques : **désactivés**
- Vue simplifiée : **non activée** (vue normale)
- Réglages : accès limité (pas d'abonnement, pas d'achat SMS, pas de gestion utilisateurs)
- Logs SAV : désactivés
- Abonnement/Achat SMS : **désactivés**

**3. Admin Magasin (shop_admin)** :
- Menus : Dossiers SAV, Stock pièces, Devis, Commandes, Clients, Agenda, Chat clients → activés
- Tableau de bord, Rapports, Statistiques : activés
- **Menu Réglages : désactivé** (disparaît complètement du menu)
- **Vue simplifiée : activée par défaut**
- Logs SAV : désactivés
- Abonnement/Achat SMS : désactivés

### Structure des permissions (jsonb)

```json
{
  "menu_dashboard": true,
  "menu_sav": true,
  "menu_parts": true,
  "menu_quotes": true,
  "menu_orders": true,
  "menu_customers": true,
  "menu_chats": true,
  "menu_agenda": true,
  "menu_reports": true,
  "menu_statistics": true,
  "menu_settings": true,
  "settings_subscription": true,
  "settings_sms_purchase": true,
  "settings_users": true,
  "settings_import_export": true,
  "sav_logs": true,
  "can_delete_sav": true,
  "can_create_quotes": true,
  "can_manage_stock": true,
  "simplified_view_default": false
}
```

### Corrections apportées

1. **Migration SQL** : créer `shop_role_permissions` et `default_role_permissions` avec RLS. Insérer les 3 rôles par défaut (admin, technician, shop_admin) dans `default_role_permissions` avec les valeurs détaillées ci-dessus.

2. **Hook `useRolePermissions.ts`** : récupère les permissions du rôle courant de l'utilisateur. Fallback sur `default_role_permissions`. Cache avec `placeholderData` + realtime.

3. **Composant `RolePermissionsManager.tsx`** dans Settings > Utilisateurs : sélecteur des 3 rôles, toggles groupés par catégorie. Visible uniquement pour les admins.

4. **Composant `DefaultRolePermissionsManager.tsx`** dans Super Admin : même interface mais pour les valeurs par défaut globales appliquées à la création de nouvelles boutiques.

5. **Sidebar.tsx** : combiner `useMenuPermissions` (plan) + `useRolePermissions` (rôle). Un menu visible seulement si les deux autorisent. Le menu "Réglages" est masqué si `menu_settings: false`.

6. **Header.tsx** : le toggle vue simplifiée est masqué si `simplified_view_toggle: false`. Si `simplified_view_default: true`, activer la vue simplifiée par défaut au premier chargement.

7. **Settings.tsx** : masquer les onglets abonnement/SMS si `settings_subscription`/`settings_sms_purchase` sont `false`.

8. **Initialisation boutique** : à la création d'une boutique, copier les `default_role_permissions` des 3 rôles dans `shop_role_permissions`.

### Fichiers impactés

- **Migration SQL** — 2 tables, RLS, données par défaut pour les 3 rôles
- `src/hooks/useRolePermissions.ts` — nouveau
- `src/components/settings/RolePermissionsManager.tsx` — nouveau
- `src/components/admin/DefaultRolePermissionsManager.tsx` — nouveau
- `src/components/admin/SuperAdminSidebar.tsx` — nouvelle entrée menu
- `src/pages/SuperAdmin.tsx` — rendre le composant
- `src/pages/Settings.tsx` — intégrer le module + filtrer onglets
- `src/components/layout/Sidebar.tsx` — appliquer permissions rôle
- `src/components/layout/Header.tsx` — conditionner vue simplifiée

