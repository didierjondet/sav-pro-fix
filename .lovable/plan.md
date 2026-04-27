
# Intégration Brevo (API HTTP) — Tous les emails de l'application

## Contexte

Vous avez fourni des identifiants SMTP Brevo (`smtp-relay.brevo.com:587`, login `a47870001@smtp-brevo.com`). Comme expliqué, les Edge Functions Deno **ne supportent pas le SMTP nativement**, et l'application utilise déjà l'API HTTP Brevo (plus rapide et fiable). Le code multi-fournisseurs est déjà en place — il faut juste finaliser le câblage et créer le compte Brevo dans la base.

**Action requise de votre côté** : générer une **clé API Brevo** (format `xkeysib-...`) dans votre compte Brevo → menu **SMTP & API → API Keys → Generate a new API key**. Le mot de passe SMTP que vous m'avez fourni n'est pas utilisable pour l'API HTTP.

## Plan technique

### 1. Création du fournisseur Brevo en base (via Super Admin)

Une fois la clé API générée, vous l'ajouterez via l'interface existante :
- **Super Admin → SMS / Mail → Email → Ajouter**
- Choisir **Brevo Email**
- Renseigner : clé API, `from_email = noreply@fixway.fr`, `from_name = FixWay`
- Cliquer **Activer** sur la carte créée

Aucune modification de code n'est nécessaire pour cette étape — l'interface `MessagingProvidersManager` gère déjà ce flow (chiffrement AES-256, activation, désactivation).

### 2. Câblage Brevo dans toutes les Edge Functions d'envoi d'email

Actuellement seules 2 Edge Functions consultent le fournisseur actif :
- ✅ `send-contact-email` (formulaire de contact prospect) — déjà OK
- ✅ `send-invoice-notification` (notifications de factures) — déjà OK

À ajouter / modifier :

#### a) `send-invitation` (invitations d'équipiers)
Actuellement, cette fonction crée l'invitation en base et **renvoie juste l'URL** sans envoyer d'email. Je vais :
- Récupérer le fournisseur email actif (Brevo si configuré)
- Envoyer un email HTML d'invitation avec le bouton « Rejoindre l'équipe »
- Inclure : nom de l'inviteur, nom du magasin, rôle attribué, lien d'inscription
- Fallback Resend si aucun fournisseur actif (comportement déjà en place ailleurs)

#### b) Nouvelle Edge Function partagée `send-app-email` (recommandé)
Pour éviter de dupliquer la logique de décryptage / routage dans chaque fonction, je vais créer **une seule Edge Function utilitaire** :

```
supabase/functions/send-app-email/index.ts
```

Elle prend `{ to, subject, html }` et route automatiquement vers le fournisseur actif (Brevo / Resend / SMTP-fallback). Les fonctions existantes seront refactorées pour l'appeler via `supabase.functions.invoke('send-app-email', ...)`.

Bénéfices :
- Un seul endroit pour la logique de routage
- Activation/désactivation/changement de prestataire en 1 clic depuis l'interface (déjà existant)
- Logs centralisés des envois email

#### c) Emails Supabase Auth (reset mot de passe, confirmation email)
Les emails d'authentification Supabase (`resetPasswordForEmail`, signup confirmation) sont **gérés par Supabase Auth en interne**, pas par notre code. Pour les router via Brevo, deux options :

- **Option A (manuelle, recommandée et simple)** : configurer Brevo comme **SMTP custom dans le dashboard Supabase**
  - Dashboard Supabase → Project Settings → Authentication → SMTP Settings
  - Sender email : `noreply@fixway.fr`, Sender name : `FixWay`
  - Host : `smtp-relay.brevo.com`, Port : `587`
  - Username : `a47870001@smtp-brevo.com`, Password : votre **clé SMTP Brevo** (= `master password` SMTP, pas la clé API)
  - C'est la **seule option** où votre login SMTP `a47870001@smtp-brevo.com` que vous m'avez fourni est utile.
  - Je vous fournirai un guide pas-à-pas après le déploiement.

- **Option B (automatique via Auth Hook)** : implémenter un hook `auth-email-hook` qui intercepte les emails Auth et les envoie via l'API HTTP Brevo. Plus complexe, nécessite la configuration d'un hook Supabase + déploiement d'une Edge Function dédiée. Non incluse dans ce plan — à ajouter en phase 2 si besoin.

### 3. Logs & traçabilité

Création d'une table `email_send_logs` (optionnel mais recommandé) :
- `id`, `shop_id` (nullable), `provider` (`brevo_email` / `resend` / `smtp`)
- `to_email`, `subject`, `status` (`sent` / `failed`), `error_message`
- `sent_at`, `created_at`
- RLS : super_admin only

L'Edge Function `send-app-email` y inscrira chaque envoi. Visible dans le Super Admin (à brancher dans une 2e étape si vous le souhaitez).

## Récapitulatif des fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `supabase/functions/send-app-email/index.ts` | **Créé** — utilitaire central d'envoi |
| `supabase/functions/send-invitation/index.ts` | Modifié — envoi du mail d'invitation via `send-app-email` |
| `supabase/functions/send-contact-email/index.ts` | Refactor — délègue à `send-app-email` |
| `supabase/functions/send-invoice-notification/index.ts` | Refactor — délègue à `send-app-email` |
| `supabase/config.toml` | Ajout de `[functions.send-app-email]` avec `verify_jwt = false` (pour appel inter-fonctions) |
| Migration SQL | Création de la table `email_send_logs` + RLS super_admin |

## Étapes après approbation

1. Vous générez la **clé API Brevo** dans votre compte (menu *SMTP & API → API Keys*)
2. J'implémente le code (création Edge Function + refactor + migration)
3. Vous ajoutez le fournisseur Brevo via le Super Admin et l'activez
4. Test : envoyer un email via le formulaire de contact ou créer une invitation
5. (Optionnel) Vous configurez le SMTP Brevo dans Supabase Auth pour les emails reset / confirmation

## Questions importantes avant exécution

⚠️ **Le domaine `fixway.fr` doit être validé dans Brevo** (Senders, Domains & Dedicated IPs → Domains → Authenticate). Sans cette validation DKIM/SPF, Brevo refusera d'envoyer ou les mails iront en spam. Si ce n'est pas encore fait, prévoyez ~10 minutes pour ajouter les enregistrements DNS chez votre registrar.

Souhaitez-vous que je procède avec ce plan ?
