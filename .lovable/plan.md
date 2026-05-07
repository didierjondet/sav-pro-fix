## Deux bugs identifiés

### Bug 1 — Lien SMS pointe vers le preview Lovable
`useSMS.sendQuoteNotification` construit l'URL avec `${window.location.origin}/quote/${id}`. Quand le magasin est sur `id-preview--…lovable.app`, le SMS contient ce domaine → page de login Lovable au lieu du devis. Cette règle est déjà documentée pour le tracking SAV (`generateShortTrackingUrl` → `fixway.fr/track/...`) et dans la mémoire projet « Quotes: SMS links must replace preview URLs with production URLs ».

### Bug 2 — "Accepter / Refuser" depuis le SMS échoue silencieusement
La page publique `QuotePublic.tsx` appelle l'edge function avec `status: 'sms_accepted'`. Mais la contrainte SQL `quotes_status_check` n'autorise que :
`draft, sent, viewed, accepted, rejected, expired, archived, completed`.

→ La mise à jour est rejetée par Postgres (`violates check constraint`), l'edge `quote-public` renvoie 500, et le client voit "Erreur de mise à jour". Le refus fonctionne (`rejected` est autorisé) **sauf** si la contrainte plante d'abord — à vérifier mais l'utilisateur dit que les deux ne marchent pas.

L'accès public (RLS) n'est PAS le problème : `quote-public` utilise `service_role` et bypasse RLS.

## Plan

### 1. Réparer l'URL SMS (frontend)
- **`src/utils/trackingUtils.ts`** : ajouter
  - `getPublicBaseUrl()` → renvoie `https://fixway.fr` si `window.location.hostname` contient `lovable.app` / `lovableproject.com`, sinon `window.location.origin` (pour custom domains comme `logicielsav.com`).
  - `generatePublicQuoteUrl(quoteId)` → `${getPublicBaseUrl()}/quote/${quoteId}`.
- **`src/hooks/useSMS.ts`** :
  - `sendQuoteNotification` : utiliser `generatePublicQuoteUrl(quoteId)` au lieu de `window.location.origin`.
  - `sendAppointmentSMS` reçoit `confirmUrl` en paramètre — auditer `AppointmentDialog`/`AppointmentProposalDialog` et appliquer la même règle pour `/rdv/:token`.

### 2. Réparer l'acceptation SMS (DB)
- **Migration** : étendre la contrainte `quotes_status_check` pour inclure `sms_accepted` :
  ```sql
  ALTER TABLE public.quotes DROP CONSTRAINT quotes_status_check;
  ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check
    CHECK (status = ANY (ARRAY['draft','sent','viewed','accepted','sms_accepted','rejected','expired','archived','completed']));
  ```
- L'edge `quote-public` autorise déjà `sms_accepted` ; la page publique l'envoie déjà ; après migration, l'enregistrement passera.

### 3. Vérification
- Envoyer un SMS de devis de test → l'URL doit être `https://fixway.fr/quote/<id>` et s'ouvrir sans login.
- Cliquer "Accepter" → statut `sms_accepted` enregistré, message de succès.
- Cliquer un motif de refus → statut `rejected` + `rejection_reason` enregistrés.

### Hors scope
- Aucun changement RLS nécessaire (l'edge function publique fonctionne déjà).
- Pas besoin d'ajouter un token : l'`id` du devis est un UUID v4 non-énumérable. On pourra ajouter un `public_token` plus tard si besoin de durcir.
