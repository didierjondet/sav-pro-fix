## Objectif
Ajouter dans la page **SMS / Mail** (`MessagingProvidersManager`) un bouton "Synchroniser Brevo" identique à celui de la page Crédits SMS, pour consulter le solde réel sans changer de menu.

## Modifications

**Fichier :** `src/components/admin/MessagingProvidersManager.tsx`

1. Ajouter un état local `syncingBrevo` + `brevoBalance` (nullable).
2. Ajouter une fonction `syncBrevo()` qui appelle `supabase.functions.invoke('brevo-sms-balance')` (même logique que `SMSCreditsCenter`, avec toast succès/erreur).
3. Afficher un bouton **"Synchroniser Brevo"** (icône `RefreshCw`, état loading) à côté de chaque provider de type SMS dont `provider === 'brevo_sms'` et `is_active === true`.
4. Après synchro, afficher discrètement le solde retourné (`{balance} SMS disponibles`) sous le provider.

## Hors périmètre
- Aucune modification de l'edge function `brevo-sms-balance` (déjà fonctionnelle).
- Pas de changement UI sur la page Crédits SMS.
- Pas de DB migration.
