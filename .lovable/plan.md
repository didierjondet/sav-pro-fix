
## Plan mis à jour : module Inventaire avec accès admin par défaut, mais délégable par rôle

### Règle métier retenue
Le module **Inventaire** sera :
- **autorisé par défaut à l’Administrateur**
- **désactivé par défaut pour Technicien et Responsable magasin**
- **délégable** par l’Administrateur depuis le paramétrage des rôles

Donc on ne fige pas l’accès uniquement sur `admin` côté interface. On l’intègre dans le système RBAC existant pour que chaque boutique puisse choisir.

### Ce qui change par rapport au plan initial
Au lieu d’un accès codé en dur “admin only”, l’inventaire sera piloté par une **nouvelle permission de rôle**, par exemple :
- `settings_inventory` pour accéder à l’onglet Inventaire
- et si nécessaire une seconde permission plus sensible comme `inventory_apply_stock` pour valider l’inventaire et écraser les stocks

Cela permet :
- à l’admin d’y accéder immédiatement dans toutes les nouvelles boutiques
- à l’admin de donner l’accès au technicien ou au responsable magasin s’il le souhaite
- de garder une sécurité claire sur les actions critiques

### Intégration au système de rôles existant
Le projet a déjà une architecture RBAC avec :
- `useRolePermissions.ts`
- `RolePermissionsManager.tsx`
- `DefaultRolePermissionsManager.tsx`
- tables `default_role_permissions` et `shop_role_permissions`

Le module Inventaire sera branché sur ce système existant.

### Permissions à ajouter
#### Permission principale
- `settings_inventory`: permet d’afficher et d’ouvrir l’onglet Inventaire dans Paramètres

#### Permission critique recommandée
- `inventory_apply_stock`: permet de valider définitivement un inventaire et d’écraser les quantités de stock

Optionnel selon le niveau de finesse souhaité :
- `inventory_view_logs`
- `inventory_delete_session`

Mais pour rester simple et efficace, la première version peut fonctionner avec seulement :
- `settings_inventory`
- `inventory_apply_stock`

### Valeurs par défaut à prévoir
#### Admin
- `settings_inventory: true`
- `inventory_apply_stock: true`

#### Technicien
- `settings_inventory: false`
- `inventory_apply_stock: false`

#### Responsable magasin
- `settings_inventory: false`
- `inventory_apply_stock: false`

Ainsi, toute nouvelle boutique héritera automatiquement de cette règle via les permissions par défaut déjà copiées à la création.

### Modifications prévues
#### 1. Étendre le typage des permissions
Dans `useRolePermissions.ts` :
- ajouter les nouvelles clés au type `RolePermissions`
- les ajouter dans `ROLE_DEFAULTS`
- garder une logique fail-closed

#### 2. Étendre les écrans de gestion des rôles
Dans :
- `src/components/settings/RolePermissionsManager.tsx`
- `src/components/admin/DefaultRolePermissionsManager.tsx`

Ajouter dans la section “Réglages accessibles” ou “Fonctionnalités” :
- accès au module Inventaire
- validation / application finale des stocks

L’admin pourra donc activer ces droits pour Technicien ou Responsable magasin.

#### 3. Ajouter l’onglet Inventaire dans Paramètres
Dans `src/pages/Settings.tsx` :
- afficher l’onglet seulement si `rolePermissions.settings_inventory` est vrai
- afficher le contenu Inventaire seulement si cette permission est vraie
- si l’onglet est demandé dans l’URL sans permission, rediriger vers un onglet autorisé

#### 4. Sécuriser aussi les actions sensibles hors UI
L’interface seule ne suffit pas. Il faudra sécuriser :
- création / reprise / suppression d’inventaire
- consultation des logs
- validation finale avec écrasement du stock

Comme la permission est stockée en JSON RBAC, il faudra prévoir une vraie vérification côté base, pas seulement côté React.

### Sécurité base de données à prévoir
Pour que la délégation fonctionne proprement, les nouvelles tables d’inventaire devront utiliser des politiques alignées sur le RBAC.

Deux approches possibles, la meilleure ici étant :

#### Approche retenue
Créer une fonction SQL de vérification de permission, du type :
```text
public.has_shop_role_permission(_shop_id uuid, _permission text)
```

Cette fonction ira lire :
- le rôle du profil courant
- les permissions spécifiques boutique dans `shop_role_permissions`
- sinon les permissions par défaut dans `default_role_permissions`

Puis retournera vrai/faux.

Ensuite, les policies RLS des tables inventaire pourront faire :
```text
shop_id = get_current_user_shop_id()
AND public.has_shop_role_permission(shop_id, 'settings_inventory')
```

Et pour l’application finale du stock :
```text
shop_id = get_current_user_shop_id()
AND public.has_shop_role_permission(shop_id, 'inventory_apply_stock')
```

### Pourquoi cette approche est importante
Sans cela :
- un technicien à qui l’admin donne l’accès dans l’UI verrait l’onglet
- mais serait potentiellement bloqué au moment des écritures réelles
- ou inversement, une personne pourrait appeler les tables directement si seule l’UI protège

Avec la fonction SQL + RLS :
- le droit donné par l’admin devient un vrai droit métier exploitable partout
- le module reste multi-boutique et cohérent

### Impact sur le module Inventaire lui-même
Le module gardera les 3 modes prévus :
- assisté
- scan / QR / SKU
- manuel

Mais leurs accès seront organisés ainsi :
- consultation / saisie / reprise : `settings_inventory`
- validation finale avec mise à jour du stock : `inventory_apply_stock`

Cela permet un usage très pratique :
- l’admin peut laisser un technicien compter les pièces
- puis garder pour lui la validation finale
- ou déléguer aussi la validation s’il le souhaite

### Ajustement des historiques et logs
Les logs d’inventaire resteront traçables, avec :
- utilisateur
- rôle
- action
- ancienne valeur
- nouvelle valeur
- date/heure

Accès recommandé :
- lecture si `settings_inventory`
- actions destructives selon `inventory_apply_stock` ou permission dédiée si on affine plus tard

### Migrations à prévoir
#### Migration 1
Étendre les JSON de permissions par défaut :
- ajouter `settings_inventory`
- ajouter `inventory_apply_stock`

Et mettre à jour les lignes existantes dans `default_role_permissions`.

#### Migration 2
Mettre à jour les permissions déjà copiées en boutique dans `shop_role_permissions` pour injecter les nouvelles clés sans casser les réglages existants.

#### Migration 3
Créer la fonction SQL de lecture de permission RBAC côté base pour les nouvelles RLS inventaire.

#### Migration 4
Créer les tables d’inventaire + policies RLS basées sur cette fonction.

### UX finale souhaitée
```text
Paramètres
 ├─ Magasin
 ├─ Notifications
 ├─ Apparence
 ├─ Import/Export
 ├─ Statuts SAV
 ├─ Types SAV
 ├─ Facturation
 ├─ IA
 ├─ Utilisateurs
 └─ Inventaire   <-- visible seulement si settings_inventory = true
```

Dans “Autorisations par rôle” :
```text
Réglages accessibles
- Abonnement / Plans
- Achat de SMS
- Gestion des utilisateurs
- Import / Export
- Inventaire

Fonctionnalités
- Voir les logs SAV
- Créer des devis
- Gérer le stock
- Valider un inventaire et appliquer les stocks
- Vue simplifiée par défaut
```

### Résultat attendu
Vous obtenez exactement la nuance métier demandée :
- l’**Administrateur** garde l’accès par défaut
- les autres rôles ne l’ont pas par défaut
- mais l’Administrateur peut **déléguer l’accès au module Inventaire**
- et éventuellement déléguer aussi la **validation finale**
- le tout de manière cohérente dans l’UI, les permissions de rôle, et la sécurité base de données
