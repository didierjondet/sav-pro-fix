

## Plan : remise à zéro des pièces négatives Agde + protection contre les stocks négatifs

### Partie A — Remise à zéro immédiate (Easycash Agde)

Détecter et corriger toutes les pièces du magasin Agde dont la quantité physique est `< 0` :
- `UPDATE parts SET quantity = 0 WHERE shop_id = 'add89e6c-...' AND quantity < 0`
- Avant l'opération : un `SELECT` listant les pièces concernées (nom, référence, quantité actuelle) pour journalisation dans le chat.
- Aucun PDF généré (correction silencieuse), mais récapitulatif affiché : « X pièces remises à 0 ».

### Partie B — Protection logicielle contre les stocks négatifs

L'objectif : aucune action utilisateur ou système ne peut faire passer `parts.quantity` en dessous de 0. Si l'opération demanderait un négatif, on plafonne à 0 **et** on déclenche une alerte.

**1. Garde-fou base de données (universel, couvre tous les chemins)**

Créer un trigger `BEFORE UPDATE OR INSERT ON parts` qui :
- Si `NEW.quantity < 0` → force `NEW.quantity := 0`.
- Insère une notification dans `notifications` (type `stock_negative_blocked`, `shop_id`, `part_id`, titre + message reprenant le nom de la pièce et la quantité demandée).

Avantage : protège quel que soit l'appelant (UI, edge function, import, ajustement de stock, conversion devis, clôture SAV…).

**2. Garde-fou côté hooks applicatifs (UX immédiate)**

Dans `src/hooks/useParts.ts` :
- `updatePartQuantity(partId, quantity)` : si `quantity < 0`, plafonner à 0 et afficher un toast destructif « Stock impossible : la quantité demandée dépasse le stock disponible ».
- `adjustStock(partId, adjustment)` : déjà sécurisé par `Math.max(0, …)`, mais si le calcul `part.quantity + adjustment < 0`, afficher en plus un toast d'avertissement (au lieu de la simple confirmation actuelle).

Dans les autres points de décrément que je vérifierai (recherche `quantity:` / `quantity -` dans les hooks `useSAVCases`, `useQuotes`, `useOrders`, `useSAVPartsCosts`) : appliquer la même règle de plafonnage à 0 + toast d'alerte si une décrémentation aurait conduit à un négatif.

**3. Notification temps réel dans l'app**

Étendre `useNotifications` (et le composant `NotificationBell`) pour reconnaître le nouveau type `stock_negative_blocked` :
- Icône d'alerte rouge, libellé « Stock insuffisant », lien direct vers la fiche pièce (`/parts?id=...`).
- Compté dans le badge de notifications standard (pas un canal séparé).

### Vérifications

- Après migration : `SELECT COUNT(*) FROM parts WHERE shop_id = 'agde' AND quantity < 0` retourne 0.
- Tentative manuelle (ex : ajustement -999) → quantité reste à 0, toast affiché, notification créée et visible dans la cloche.
- Conversion devis ou clôture SAV avec stock insuffisant → idem, plus de stock négatif possible.
- Aucun changement visuel sur les pages déjà validées (table parts, formulaires) ; uniquement les toasts et la notification s'ajoutent.

### Fichiers / actions

**Données (one-shot)**
- `UPDATE parts` ciblé sur Easycash Agde via outil d'insertion.

**Migration SQL**
- Trigger `prevent_negative_part_quantity` sur `parts` (BEFORE INSERT/UPDATE) + fonction associée qui notifie.

**Code modifié**
- `src/hooks/useParts.ts` (toasts d'alerte, plafonnage défensif)
- `src/hooks/useNotifications.ts` (mapping du nouveau type)
- `src/components/notifications/NotificationBell.tsx` (icône + libellé du nouveau type)
- Tout autre hook qui décrémente directement `quantity` détecté lors de l'implémentation (recherche ciblée avant édition)

Aucune modification RLS, aucune nouvelle table.

