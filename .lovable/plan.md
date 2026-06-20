## Étape 6 — Revue des fonctions SECURITY DEFINER publiques

### Contexte
Le linter Supabase signale des fonctions `SECURITY DEFINER` accessibles publiquement. Certaines sont **légitimes** (espace client sans authentification : suivi SAV, devis publics, satisfaction, RDV). D'autres peuvent nécessiter un durcissement.

### Approche ultra-prudente
**Aucune modification logique** — uniquement :
1. **Audit** : lister toutes les fonctions `SECURITY DEFINER` du schéma `public` via `pg_proc`.
2. **Classification** en 3 catégories :
   - ✅ **Légitimement publiques** (espace client anonyme) → on documente, on ne touche pas
     - `get_tracking_info`, `get_tracking_messages`, `mark_tracking_messages_read` (suivi SAV par QR code)
     - Fonctions liées à `quote-public`, satisfaction, confirmation RDV
   - 🔒 **Internes** (admin/auth uniquement) → vérifier que `REVOKE EXECUTE FROM anon` est en place
   - ⚠️ **À durcir** → restreindre les paramètres exposés (ex : ne pas retourner d'email/téléphone si pas nécessaire)
3. **Migration minimale** : uniquement `REVOKE EXECUTE ... FROM anon/public` sur les fonctions internes mal exposées. Aucun `CREATE OR REPLACE`, aucun changement de signature.

### Pourquoi c'est sûr
- `REVOKE` est purement restrictif et **rollbackable** (`GRANT EXECUTE ... TO anon`).
- Aucune fonction utilisée par le frontend client (suivi, devis, satisfaction, RDV) ne sera touchée — uniquement celles qu'aucun code public n'appelle.
- Avant chaque `REVOKE`, je vérifie via `rg` qu'aucun appel `.rpc('nom_fonction')` n'existe côté client public.

### Livrables
1. **Rapport d'audit** (chat) listant chaque fonction `SECURITY DEFINER`, son usage actuel, sa classification.
2. **Migration `REVOKE`** uniquement si des fonctions internes sont exposées à `anon` à tort.
3. **Validation post-migration** :
   - Espace client public : ouvrir un lien de suivi SAV → doit marcher
   - Devis public : ouvrir un lien SMS devis → doit marcher  
   - Satisfaction : ouvrir un lien `/satisfaction/:token` → doit marcher
   - Confirmation RDV : ouvrir `/rdv/:token` → doit marcher
   - Re-scan linter → alertes correspondantes doivent disparaître

### Hors périmètre (étapes suivantes)
- Étape 7 : Auth settings (OTP expiry, version Postgres)
- Étape 8 : Buckets storage publics + politiques RLS restantes

Aucune modification du frontend, des tables, des données, ou de la logique métier dans cette étape.
