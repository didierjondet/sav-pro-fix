
# Nettoyage automatique des boutiques inactives

## Objectif
Supprimer automatiquement les boutiques créées mais jamais réellement utilisées (aucune donnée SAV, client, devis, pièce, RDV, message créée/modifiée) après 60 jours d'inactivité, avec préavis de 7 jours par mail + SMS + bandeau rouge, et libération virtuelle des SMS non utilisés. Activable/désactivable depuis le menu Super Admin → Alertes.

## Règles fonctionnelles
- **Période d'inactivité** : 60 jours sans aucune activité métier.
- **Activité** = présence ou modification d'au moins une ligne dans : `sav_cases`, `customers`, `parts`, `quotes`, `appointments`, `sav_messages`, `order_items`, `loaner_loans`, `inventory_sessions`. Si tous ces compteurs = 0 et `max(updated_at, created_at)` côté shop ≥ 60 jours → boutique éligible.
- **À la création de la boutique** : modale d'avertissement claire "Sans aucune donnée saisie pendant 60 jours, la boutique sera automatiquement supprimée". Acquittement obligatoire.
- **J-7 avant suppression** :
  - Bandeau rouge persistant en haut de l'app pour tous les utilisateurs de la boutique (compte à rebours en jours).
  - Email + SMS au créateur / admin de la boutique avec date exacte de suppression.
  - Notification interne (cloche).
- **J0** :
  - Suppression totale en cascade (voir section technique) pour libérer le nom + l'email.
  - Les SMS achetés non utilisés sont restitués virtuellement dans `admin_sms_credits_history` (motif `inactive_shop_refund`) pour conserver la projection comptable, sans les rendre à un compte utilisateur (boutique supprimée).
- **Toute activité réelle pendant les 60 jours réinitialise le compteur** et annule un éventuel préavis.

## Switch Super Admin
- Dans `Menu Alertes` (composant `SystemAlertsManager`), ajout d'une ligne `inactive_shop_cleanup` réutilisant le même pattern que les alertes existantes (`is_enabled`, `threshold_value` = 60, `check_frequency_hours` = 24).
- Si désactivé : aucun préavis, aucune suppression, aucun bandeau.

## Détails techniques

### Migration DB
- Table `shops` : ajout de
  - `inactivity_warning_sent_at TIMESTAMPTZ`
  - `scheduled_deletion_at TIMESTAMPTZ`
  - `inactivity_policy_acknowledged_at TIMESTAMPTZ`
- Fonction SQL `public.get_shop_last_activity(shop_id uuid) RETURNS timestamptz` (SECURITY DEFINER) qui prend le max des `greatest(created_at, updated_at)` sur les tables métier ci-dessus, fallback `shops.created_at`.
- Insertion d'une ligne `system_alerts` (`alert_type='inactive_shop_cleanup'`, `is_enabled=false` par défaut, `threshold_value=60`).
- RPC `mark_shop_activity_policy_acknowledged(shop_id)`.

### Edge function `cleanup-inactive-shops` (cron quotidien via pg_cron + pg_net)
1. Vérifie que l'alerte `inactive_shop_cleanup` est `is_enabled=true`. Sinon, exit.
2. Pour chaque boutique :
   - Calcule `last_activity` via la fonction SQL.
   - `days_inactive = now() - last_activity`.
   - Si `days_inactive ≥ 53` et `inactivity_warning_sent_at IS NULL` :
     - Envoi email (`send-transactional-email`, nouveau template `shop-inactivity-warning`).
     - Envoi SMS via le provider configuré (réutilise `messaging_providers`).
     - Création d'une notification en base.
     - `scheduled_deletion_at = now() + 7 days`, `inactivity_warning_sent_at = now()`.
   - Si `days_inactive ≥ 60` et `scheduled_deletion_at ≤ now()` :
     - Crédite virtuellement les SMS restants dans `admin_sms_credits_history`.
     - DELETE en cascade : toutes les tables FK-liées à `shop_id`, puis suppression des `profiles` rattachés, puis appel admin API pour supprimer les `auth.users` orphelins (uniquement ceux n'ayant plus aucun `profiles.shop_id`).
     - DELETE de `shops`.
   - Si activité détectée pendant le préavis : reset (`inactivity_warning_sent_at = NULL`, `scheduled_deletion_at = NULL`).
3. Logs dans `alert_history`.

### Frontend
- Nouveau composant `InactivityWarningBanner` (rouge, sticky en haut, J-N jours, CTA "Saisir des données"). Affiché si `shops.scheduled_deletion_at` est défini pour la boutique courante.
- Nouveau composant `ShopCreationPolicyDialog` ouvert automatiquement après création / au premier login d'un shop sans `inactivity_policy_acknowledged_at`. Bouton "J'ai compris" → RPC.
- `SystemAlertsManager` : aucun changement de code nécessaire si l'alerte suit le pattern existant ; sinon ajout d'un libellé spécifique.

### Email / SMS
- Template email `shop-inactivity-warning` (date suppression, nom boutique, CTA login).
- Message SMS court paramétrable via `system_alerts.sms_message_1`.

### Sécurité
- Fonction de suppression `SECURITY DEFINER`, restreinte à l'edge function (clé service role).
- Vérifie l'absence totale d'activité juste avant DELETE (double-check pour éviter une race condition).

## Fichiers impactés
- `supabase/migrations/<new>.sql`
- `supabase/functions/cleanup-inactive-shops/index.ts` (nouvelle)
- `supabase/functions/_shared/transactional-email-templates/shop-inactivity-warning.tsx` + registry
- `src/components/layout/InactivityWarningBanner.tsx` (nouveau)
- `src/components/onboarding/ShopCreationPolicyDialog.tsx` (nouveau)
- `src/App.tsx` ou layout principal : montage du banner + dialog
- `src/components/admin/SystemAlertsManager.tsx` : libellé pour le nouveau type d'alerte
- Cron pg_cron via `supabase--insert`

## Hors scope
- Aucun changement aux règles de facturation/Stripe.
- Pas de récupération possible après suppression (irréversible — c'est le but).
