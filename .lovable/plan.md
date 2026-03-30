

## Diagnostic confirme

La table `subscription_plans` contient : **Découverte**, **Premium**, **Enterprise**, **Sur mesure**.
La colonne `subscription_tier` des shops contient : **free**, **premium**, **enterprise**.

Le hook `useSubscriptionFeatures.ts` fait `.ilike('name', 'free')` → aucun plan trouvé → fallback restrictif avec `quotes: false`, `orders: false`, `chats: false`, `statistics: false`.

## Plan de correction

### 1. Migration SQL : ajouter une colonne `tier_key` a `subscription_plans`

Ajouter une colonne `tier_key` (text, unique) qui fait la correspondance directe avec `subscription_tier` des shops :

| Plan name   | tier_key    |
|-------------|-------------|
| Découverte  | free        |
| Premium     | premium     |
| Enterprise  | enterprise  |
| Sur mesure  | custom      |

Migration :
- `ALTER TABLE subscription_plans ADD COLUMN tier_key text`
- `UPDATE` pour assigner les valeurs
- `CREATE UNIQUE INDEX` sur `tier_key`

### 2. Migration SQL : assigner `subscription_plan_id` aux shops orphelins

Mettre a jour tous les shops qui ont `subscription_plan_id IS NULL` en leur assignant le plan correspondant a leur `subscription_tier` via la nouvelle colonne `tier_key`.

### 3. Corriger `useSubscriptionFeatures.ts`

- Quand `subscription_plan_id` est NULL, chercher par `tier_key` au lieu de `name`
- Rendre le fallback d'erreur **permissif** : tout a `true`

### 4. Harmoniser l'affichage du nom de plan partout

- `Settings.tsx` ligne 1737 : afficher `planName` du hook au lieu de `subscription_tier` brut
- `SMSPackagesDisplay.tsx` : idem
- `Subscription.tsx` : matcher par `tier_key` au lieu de comparer `name.toLowerCase()` avec `subscription_tier`

### Fichiers modifies

- **Migration SQL** (nouvelle)
- **`src/hooks/useSubscriptionFeatures.ts`** : lookup par `tier_key`, fallback permissif
- **`src/pages/Settings.tsx`** : afficher "Découverte" au lieu de "free"
- **`src/pages/Subscription.tsx`** : matcher plans via `tier_key`
- **`src/components/subscription/SMSPackagesDisplay.tsx`** : afficher le vrai nom du plan

