

## Plan : Menu "SMS / Mail" multi-fournisseurs avec Brevo dans Super Admin

### Objectif
Creer un systeme de gestion multi-fournisseurs SMS et Email, configurable a la volee par le Super Admin, incluant Twilio, Brevo, Resend et SMTP generique. Le meme pattern que `AIEngineManager` / `ai_engine_config` sera replique.

### 1. Migration base de donnees : table `messaging_providers`

```sql
CREATE TABLE messaging_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('sms', 'email')),
  provider text NOT NULL, -- twilio_gateway, twilio_direct, brevo_sms, brevo_email, resend, smtp
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  encrypted_config jsonb DEFAULT NULL, -- cles API chiffrees (meme crypto AES-GCM que ai_engine_config)
  from_address text DEFAULT NULL, -- numero tel ou email expediteur
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE messaging_providers ENABLE ROW LEVEL SECURITY;
-- RLS : Super Admin uniquement
-- Contrainte : un seul provider actif par type
CREATE UNIQUE INDEX idx_one_active_per_type ON messaging_providers (type) WHERE is_active = true;
```

### 2. Sidebar Super Admin
Ajouter une entree **"SMS / Mail"** (icone `Mail`) dans `SuperAdminSidebar.tsx`, section "Configuration".

### 3. Nouveau composant `MessagingProvidersManager.tsx`
Interface avec deux onglets (SMS / Email), inspiree de `AIEngineManager` :
- Liste des fournisseurs configures avec badge "Actif"
- Formulaire d'ajout/modification avec champs dynamiques selon le provider :
  - **Twilio Gateway** : pas de config (utilise secrets existants)
  - **Twilio Direct** : Account SID, Auth Token, numero expediteur
  - **Brevo SMS** : cle API Brevo, nom expediteur
  - **Brevo Email** : cle API Brevo, email expediteur
  - **Resend** : cle API, email expediteur
  - **SMTP** : host, port, user, password, email expediteur
- Bouton "Activer" qui desactive les autres du meme type
- Bouton "Tester" pour valider la config

### 4. Edge Function `save-messaging-provider`
Recoit la config, chiffre les secrets (AES-GCM, meme `AI_ENCRYPTION_KEY`), sauvegarde dans `messaging_providers`. Similaire a `save-ai-config`.

### 5. Refonte de `send-sms/index.ts`
Au lieu de toujours appeler Twilio Gateway :
1. Lire le provider SMS actif dans `messaging_providers` (via service role)
2. Dechiffrer la config
3. Router vers l'adaptateur correspondant :
   - **twilio_gateway** : logique actuelle (gateway Lovable)
   - **twilio_direct** : appel direct API Twilio avec SID/Token
   - **brevo_sms** : appel API Brevo SMS (`POST https://api.brevo.com/v3/transactionalSMS/sms`)
4. Si aucun provider actif : erreur explicite
5. La logique de credits, historique et integration discussion reste inchangee

### 6. Refonte des fonctions email
- `send-contact-email` et `send-invoice-notification` :
  1. Lire le provider email actif dans `messaging_providers`
  2. Router vers : **resend** (actuel), **brevo_email** (`POST https://api.brevo.com/v3/smtp/email`), ou **smtp** generique
  3. Si aucun provider actif : fallback Resend (retro-compatible)

### 7. Integration dans `SuperAdmin.tsx`
Ajouter le case `'messaging'` qui rend `<MessagingProvidersManager />`.

### Fichiers concernes
- **Nouveau** : migration SQL pour `messaging_providers`
- **Nouveau** : `src/components/admin/MessagingProvidersManager.tsx`
- **Nouveau** : `supabase/functions/save-messaging-provider/index.ts`
- **Modifie** : `src/components/admin/SuperAdminSidebar.tsx` (ajout menu)
- **Modifie** : `src/pages/SuperAdmin.tsx` (ajout section)
- **Modifie** : `supabase/functions/send-sms/index.ts` (routage multi-provider)
- **Modifie** : `supabase/functions/send-contact-email/index.ts` (routage multi-provider)
- **Modifie** : `supabase/functions/send-invoice-notification/index.ts` (routage multi-provider)

### Ce qui ne change PAS
- `useSMS.ts` et tous les composants frontend qui envoient des SMS
- La logique de credits et compteurs SMS
- Le formatage des numeros de telephone
- L'historique SMS (`sms_history`)

### Fournisseurs inclus

| Type | Provider | API |
|------|----------|-----|
| SMS | Twilio Gateway | Gateway Lovable (existant) |
| SMS | Twilio Direct | API Twilio directe |
| SMS | Brevo SMS | `api.brevo.com/v3/transactionalSMS/sms` |
| Email | Resend | npm resend (existant) |
| Email | Brevo Email | `api.brevo.com/v3/smtp/email` |
| Email | SMTP | Connexion SMTP generique |

