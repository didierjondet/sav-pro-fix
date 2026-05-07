## Diagnostic

Les SMS sont envoyés (statut `sent` + Twilio SID en DB) mais **non livrés** depuis qu'on a remplacé l'URL preview par `https://fixway.fr/quote/<UUID>`.

Preuve dans `sms_history` :
- ✅ Reçu : `fixway.fr/track/didierjond5262` (SAV — sans `https://`, slug court)
- ❌ Non reçu : `https://fixway.fr/quote/abeb6ba2-3868-4d4b-a935-be229c5abe5c`

Brevo SMS (provider actif) applique un filtrage anti-spam silencieux sur les SMS contenant `https://` + UUID long. Le SID est retourné côté API mais le message est droppé en aval. Le SAV échappe au filtre car il utilise déjà un slug court sans schéma (`generateShortTrackingUrl`).

## Plan

### 1. Aligner les URL de devis sur le format SAV (sans `https://`)

**`src/utils/trackingUtils.ts`** :
- `generatePublicQuoteUrl(quoteId)` doit renvoyer `fixway.fr/quote/<id>` **sans** `https://` (sur preview/lovable). Sur custom domain, renvoyer `<host>/quote/<id>` sans schéma.
- Idem `generatePublicAppointmentUrl(token)` → `fixway.fr/rdv/<token>`.

Les SMS clients des téléphones rendent ces liens cliquables sans le schéma (comme déjà constaté avec `/track/`).

### 2. (Optionnel) Raccourcir l'identifiant
L'UUID complet reste long (36 chars). On garde l'UUID pour cette itération (changer le schéma de `quotes` impose une migration `public_slug`). Si Brevo continue de filtrer après l'étape 1, on ajoutera un `public_slug` court (ex. base36 8 chars) en seconde itération — pas dans ce plan.

### 3. Vérifier côté SAV
Le SAV utilise déjà `generateShortTrackingUrl` (`fixway.fr/track/<slug>`) sans `https://`. Aucun changement à prévoir — confirmé par les SMS reçus en production.

### 4. Vérification
- Créer un nouveau devis avec téléphone test → cliquer "Envoyer SMS".
- Le message doit contenir `fixway.fr/quote/<id>` (sans `https://`).
- Réception sur le téléphone à confirmer.
- Vérifier en parallèle qu'un SMS SAV arrive toujours (sanity check).

### Fichiers modifiés
- `src/utils/trackingUtils.ts` (retirer `https://` dans `generatePublicQuoteUrl` et `generatePublicAppointmentUrl`).

### Hors scope
- Pas de migration DB.
- Pas de changement edge function `send-sms` (le provider routing est correct).
- Le double toast de création de devis (signalé au tour précédent) reste à traiter dans un plan séparé si tu confirmes.
