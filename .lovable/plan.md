# Gestion SMS unifiée (Brevo)

## Objectif
Fusionner les 2 entrées actuelles du Super Admin (Fonctionnalités → "Crédits SMS" qui contient `TwilioCreditsManager` + `SMSCreditManager`, et Configuration → "SMS / Mail" / `MessagingProvidersManager` côté providers) en **une seule page "Crédits SMS"** centrée sur Brevo, avec vue projetée (réservés / restants), réallocation, alertes et reset mensuel.

Le menu "SMS / Mail" (providers) reste tel quel — il configure les fournisseurs, ce qui est une autre responsabilité. On supprime uniquement la logique "crédits Twilio" obsolète de la page Crédits.

## 1. Nettoyage Twilio dans la page Crédits SMS

- Retirer `TwilioCreditsManager` de `case 'sms'` dans `src/pages/SuperAdmin.tsx`.
- Le composant `TwilioCreditsManager.tsx` et le hook `useTwilioCredits.ts` ne sont plus rendus dans cette page (gardés en fichier au cas où, mais non importés ici).
- `global_sms_credits` (table) est conservée mais re-sémantisée comme **"pot global de crédits SMS Brevo"** (champ `twilio_balance_usd` renommé en lecture → `provider_balance` côté UI ; la colonne DB reste pour compat).

## 2. Nouvelle page unifiée : `SMSCreditsCenter`

Nouveau composant `src/components/admin/sms/SMSCreditsCenter.tsx` rendu dans `case 'sms'`, structuré en 3 blocs verticaux :

### Bloc A — Solde Brevo & pot global (header KPI)
4 cartes KPI :
1. **Solde Brevo (réel)** — récupéré via une nouvelle edge function `brevo-sms-balance` qui appelle `GET https://api.brevo.com/v3/account` (champ `plan[].credits` type `sms`). Bouton "Synchroniser".
2. **Crédits alloués aux boutiques** — somme des `sms_credits_allocated` + `admin_added_sms_credits` + `purchased_sms_credits non utilisés` de toutes les boutiques actives.
3. **Crédits réservés (mois en cours)** — somme `monthly_sms_used` + crédits achetés/admin déjà consommés.
4. **Balance projetée** = Solde Brevo − (alloué − réservé). Badge couleur :
   - vert si > 20% du solde
   - orange si 5–20%
   - rouge si < 5% (avec alerte visuelle "Recréditer Brevo")

### Bloc B — Configuration & actions globales
- Seuil d'alerte (nb SMS restants) + téléphone destinataire → stocké dans `twilio_alert_config` (réutilisé, renommé visuellement "Alerte SMS Brevo").
- Bouton **"Reset mensuel manuel"** : appelle un RPC `admin_reset_all_monthly_sms()` qui remet `monthly_sms_used = 0` pour toutes les boutiques (le cron mensuel existant continue à tourner le 1er).
- Bouton **"Re-créditation automatique"** : info-tooltip rappelant que `reset_monthly_counters()` tourne le 1er de chaque mois.
- Lien rapide vers la page providers ("SMS / Mail") pour rappel.

### Bloc C — Tableau boutiques (cœur opérationnel)

Tableau dense, triable, recherche par nom :

| Boutique | Plan | Mensuel (utilisé/alloué) | Achetés/Admin (restant) | Total restant | Usage % | Actions |

Actions par ligne (popovers compacts) :
- **+ Ajouter** : input nombre → met à jour `admin_added_sms_credits`.
- **− Retirer** : input nombre → décrémente `admin_added_sms_credits` (avec garde-fou ≥ 0) ET **réinjecte les crédits retirés dans `global_sms_credits.total_credits`** (pot global réattribuable).
- **Reset mensuel** (ligne unique) : remet `monthly_sms_used = 0` pour cette boutique.
- **Voir détails** : drawer avec historique `sms_history` filtré sur cette boutique (30 derniers).

Footer du tableau : ligne **TOTAUX** (alloué, restant, %).

## 3. Edge function `brevo-sms-balance`

Nouveau dossier `supabase/functions/brevo-sms-balance/index.ts` :
- `verify_jwt = true` (admin uniquement, vérifié via `is_super_admin`).
- Récupère la clé Brevo active depuis `messaging_providers` (provider `brevo_sms`, `is_active = true`) — déchiffrement AES identique à `send-sms`.
- Appelle `GET https://api.brevo.com/v3/account` avec header `api-key`.
- Extrait la ligne `plan` de type `sms` → `credits`.
- Met à jour `global_sms_credits` (`total_credits`, `last_sync_at`, `sync_status='ok'`) avec la nouvelle balance.
- Retourne `{ balance, currency, plan_name, last_sync_at }`.

Si aucun provider Brevo actif : retourne 400 avec message clair (CTA dans l'UI vers menu "SMS / Mail").

Ajout dans `supabase/config.toml` : `[functions.brevo-sms-balance] verify_jwt = true`.

## 4. Migration SQL (une seule)

```sql
-- a) Reset immédiat de tous les compteurs mensuels (demande utilisateur)
UPDATE public.shops SET monthly_sms_used = 0, last_monthly_reset = CURRENT_DATE;

-- b) Initialiser le pot global à 250 (recrédit Twilio→Brevo annoncé)
INSERT INTO public.global_sms_credits (id, total_credits, used_credits, twilio_balance_usd, sync_status, last_sync_at)
VALUES ('00000000-0000-0000-0000-000000000001', 250, 0, 0, 'manual', now())
ON CONFLICT (id) DO UPDATE SET total_credits = 250, used_credits = 0, last_sync_at = now(), sync_status = 'manual';

-- c) RPC reset global (admin)
CREATE OR REPLACE FUNCTION public.admin_reset_all_monthly_sms()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  UPDATE public.shops SET monthly_sms_used = 0, last_monthly_reset = CURRENT_DATE;
END; $$;

-- d) RPC retirer crédits admin et réinjecter dans pot global
CREATE OR REPLACE FUNCTION public.admin_remove_sms_credits(p_shop_id uuid, p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current integer;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT admin_added_sms_credits INTO v_current FROM public.shops WHERE id = p_shop_id;
  IF v_current < p_amount THEN RAISE EXCEPTION 'Crédits admin insuffisants'; END IF;
  UPDATE public.shops SET admin_added_sms_credits = admin_added_sms_credits - p_amount WHERE id = p_shop_id;
  UPDATE public.global_sms_credits 
    SET total_credits = total_credits + p_amount, last_sync_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001';
  RETURN jsonb_build_object('success', true, 'reallocated', p_amount);
END; $$;
```

Pas de nouvelle table → pas de GRANT supplémentaire.

## 5. UI / esthétique

- Cartes KPI en grid responsive (4 col desktop, 2 col tablet, 1 col mobile), icônes Lucide, dégradés des tokens existants (`bg-gradient-primary`).
- Tableau avec `sticky` header, lignes hover, badges colorés selon `usage_percent` (vert <60, orange 60–85, rouge >85).
- Tous les inputs `NumberInput` existant, boutons `Button` avec variantes du design system.
- Toasts confirmant chaque action.
- Aucun nouveau token CSS (réutilise ceux d'`index.css`).

## 6. Suppressions / dépréciations

- `SMSCreditManager.tsx` et `TwilioCreditsManager.tsx` : remplacés par `SMSCreditsCenter`. Fichiers supprimés.
- `DetailedSMSCreditsView.tsx` et `SMSCreditsTab.tsx` : vérifier qu'ils ne sont plus référencés ailleurs ; si oui, les laisser, sinon supprimer.

## Fichiers touchés
- créés : `src/components/admin/sms/SMSCreditsCenter.tsx`, `src/hooks/useBrevoSMSBalance.ts`, `supabase/functions/brevo-sms-balance/index.ts`, 1 migration SQL
- modifiés : `src/pages/SuperAdmin.tsx`, `supabase/config.toml`
- supprimés : `src/components/admin/TwilioCreditsManager.tsx`, `src/components/admin/SMSCreditManager.tsx`

## Hors scope
- Pas de modification de `MessagingProvidersManager` (menu "SMS / Mail" reste intact).
- Pas de modification du flow d'envoi SMS (`send-sms` continue à router Brevo/Twilio comme aujourd'hui).
- Pas de changement de l'UI boutique côté `SMSCreditsDisplay` (consomme déjà `get_sms_credits_breakdown`).
