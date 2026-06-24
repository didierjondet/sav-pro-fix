
# Alerte SMS basée sur la balance projetée

## Constat
Aujourd'hui `check-sms-credits` interroge Twilio (USD/0.08 ≈ SMS) et compare ce solde à 100. Or l'écran Super Admin → Crédits SMS utilise une **balance projetée** = `solde Brevo − (alloué − consommé)` qui reflète vraiment les SMS Brevo non réservés par les boutiques. Le déclenchement doit s'aligner sur cette balance projetée et l'envoi doit passer par le provider SMS Brevo configuré.

## Modifications

### `supabase/functions/check-sms-credits/index.ts` (refonte)
- Récupérer l'alerte `system_alerts` (`sms_credits`, activée). Si désactivée, sortir.
- Récupérer le seuil depuis `twilio_alert_config.threshold_sms` (fallback `system_alerts.threshold_value`, défaut 100).
- Récupérer le numéro de destination depuis `twilio_alert_config.alert_phone`. Si vide, sortir avec log.
- Recalculer le solde Brevo :
  - Appeler `brevo-sms-balance` en interne (ou répliquer la lecture `messaging_providers` + `https://api.brevo.com/v3/account`) pour rafraîchir `global_sms_credits.total_credits`.
- Calculer la **balance projetée** :
  - `allocated = SUM(shops.sms_credits_allocated + shops.purchased_sms_credits + shops.admin_added_sms_credits)`
  - `used = SUM(shops.sms_credits_used)`
  - `projected = brevoBalance − (allocated − used)`
- Si `projected <= seuil` ET cooldown 24h respecté :
  - Sélectionner le message selon criticité (`sms_message_1/2/3`).
  - Remplacer `${threshold}`, `${remaining}` (= `projected`).
  - Envoyer le SMS via **Brevo Transactional SMS** (`POST https://api.brevo.com/v3/transactionalSMS/sms`) en utilisant la clé du provider actif (`messaging_providers` type=`brevo_sms` ou type=`sms` provider=`brevo_sms`).
  - Logger dans `alert_history` (current_value = projected).
  - Mettre à jour `last_alert_sent_at`.
- Mettre à jour `last_check_at` dans tous les cas.

### Cooldown
Conserver la fenêtre de 24h existante pour éviter le spam, mais elle se réinitialise déjà à chaque remontée au-dessus du seuil dans la pratique (cooldown court côté logique). Aucun changement.

### Aucun changement UI
La page Crédits SMS reste identique (seuil + numéro d'alerte déjà configurables).

## Hors scope
- Twilio n'est plus consulté pour le déclenchement (l'envoi devient 100 % Brevo) ; le secret Twilio reste utilisable ailleurs.
- Pas de modification du calcul de la balance projetée côté frontend.

## Fichier impacté
- `supabase/functions/check-sms-credits/index.ts`
