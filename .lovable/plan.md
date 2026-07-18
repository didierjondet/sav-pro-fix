## 1. Corriger l'erreur du chat diagnostic IA

**Cause identifiée :** dans `src/components/sav/SAVDiagnosticTab.tsx`, l'insertion dans `sav_diagnostic_messages` utilise `created_by: user?.id`, mais la colonne réelle en base s'appelle `user_id`. L'INSERT échoue donc systématiquement (violation de schéma), d'où le toast rouge après envoi d'une question.

**Fix :** remplacer `created_by` par `user_id` dans l'insert du message utilisateur (une seule ligne à modifier). Aucun changement de schéma nécessaire.

## 2. Archivage des certificats de non-réparabilité

**Objectif :** conserver l'historique des certificats générés pour un SAV, avec possibilité de :
- lister les certificats déjà créés dans l'onglet Documents,
- rouvrir/modifier le texte d'un certificat archivé et le réimprimer,
- en créer plusieurs versions (bouton "Nouveau certificat").

### Base de données (migration)

Nouvelle table `public.sav_certificates` :
- `sav_case_id` (FK → `sav_cases`, cascade)
- `shop_id` (FK → `shops`)
- `certificate_type` (text, défaut `'non_repairability'` — extensible pour d'autres modèles futurs)
- `title` (text)
- `content` (text — le corps éditable imprimé)
- `snapshot` (jsonb — copie figée des infos client/appareil/magasin au moment de la génération, pour réimpression fidèle même si le SAV évolue)
- `created_by` (uuid, nullable)
- `created_at`, `updated_at` (+ trigger)

RLS : lecture/écriture pour les membres du même `shop_id` (via `get_current_user_shop_id()`), service_role complet. GRANT `SELECT, INSERT, UPDATE, DELETE` à `authenticated`, GRANT ALL à `service_role`.

### UI

Refonte de `src/components/sav/NonRepairabilityCertificateDialog.tsx` en deux composants :

- `NonRepairabilityCertificatesCard.tsx` (nouveau) — carte affichée dans l'onglet Documents :
  - Bouton **"Nouveau certificat"** → ouvre le dialog en mode création.
  - Liste des certificats archivés (date, aperçu 1re ligne) avec, sur chaque ligne, 3 actions : **Imprimer**, **Modifier**, **Supprimer** (confirmation).
- `NonRepairabilityCertificateDialog.tsx` (mis à jour) :
  - Reçoit `certificateId?` optionnel.
  - À l'ouverture, charge le contenu existant (édition) ou pré-remplit le texte type (création).
  - Bouton **"Enregistrer"** (insert/update dans `sav_certificates` avec snapshot magasin/client/appareil).
  - Bouton **"Imprimer / PDF"** — imprime toujours à partir du snapshot enregistré si disponible, sinon des données live.
  - À la création, on enregistre automatiquement avant impression pour garantir l'archivage.

Intégration : remplacer dans `src/pages/SAVDetail.tsx` les deux occurrences actuelles de `<NonRepairabilityCertificateDialog ... />` (onglet Documents vue simplifiée + vue standard) par `<NonRepairabilityCertificatesCard ... />`. Aucun autre changement à la page SAV.

### Détails techniques

- Hook léger `useSAVCertificates(savCaseId)` avec React Query (`['sav_certificates', savCaseId]`) — list, create, update, delete + invalidation.
- Le snapshot évite qu'une modification ultérieure du client ou du magasin ne réécrive l'historique imprimé.
- Le template d'impression HTML A4 existant (en-tête magasin, code-barres Code128, zones signatures) est réutilisé tel quel — seule la source du contenu change (DB au lieu de state local).
