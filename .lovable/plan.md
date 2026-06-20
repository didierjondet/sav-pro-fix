## Étape 5 — Corriger les fonctions sans `search_path` figé (mode ultra-prudent)

### Contexte
Le scan Supabase remonte l'alerte **« Function Search Path Mutable »** : certaines fonctions SQL n'ont pas de `SET search_path` figé, ce qui permet en théorie un détournement via un schéma malveillant placé en tête du `search_path`.

C'est la correction la **moins risquée** parmi les warnings restants : on ne touche **aucune** politique RLS, **aucune** table, **aucune** donnée, **aucun** comportement applicatif. On ne fait qu'ajouter `SET search_path = public` (ou `public, pg_temp`) sur la définition de chaque fonction concernée.

### Pourquoi c'est sûr
- Aucune logique métier n'est modifiée : signature, corps, retour, droits — tout reste identique.
- Aucun `DROP` : on utilise `ALTER FUNCTION ... SET search_path = public` (ou `CREATE OR REPLACE` à l'identique avec la clause ajoutée).
- Aucun risque de perte d'accès aux SAV, messages, clients, etc. : on ne touche pas aux RLS.
- Réversible en une ligne : `ALTER FUNCTION ... RESET search_path`.

### Démarche
1. Lister via `supabase--linter` toutes les fonctions exactes signalées (signature complète).
2. Pour chaque fonction, écrire `ALTER FUNCTION public.<nom>(<args>) SET search_path = public;` (ou `public, pg_temp` selon le cas).
3. Une seule migration regroupant tous les `ALTER FUNCTION` — purement additive.
4. Inclure dans le fichier de migration, en commentaire, le SQL de rollback (`RESET search_path` sur chaque fonction).

### Ce que je NE touche PAS à cette étape
- Aucune politique RLS.
- Aucune table.
- Aucune fonction `SECURITY DEFINER` n'est convertie en `SECURITY INVOKER` (warnings « anon/authenticated peut exécuter SECURITY DEFINER » → traités à une étape ultérieure si tu valides).
- Aucun changement frontend.

### Plan de rollback
- **Option 1** : bouton « Revert » sous le message de la migration → restauration intégrale.
- **Option 2** : exécuter le bloc `ALTER FUNCTION ... RESET search_path;` fourni en commentaire dans la migration.

### Vérification post-migration
1. Ouvrir un SAV, envoyer un message, créer un devis, accéder au tracking public → tout doit fonctionner exactement comme avant.
2. Relancer le linter Supabase → l'alerte « Function Search Path Mutable » doit disparaître (ou drastiquement diminuer).
3. J'attends ta validation explicite avant d'enchaîner sur l'étape suivante (warnings `SECURITY DEFINER` ou OTP expiry).

### Étapes futures (pour info, pas exécutées maintenant)
- Étape 6 : revue des fonctions `SECURITY DEFINER` exécutables par `anon`/`authenticated` — au cas par cas, certaines sont **légitimement** publiques (ex. `get_tracking_messages`, `mark_tracking_messages_read`). On ne révoquera que celles qui n'ont pas vocation à être publiques.
- Étape 7 : réglages Auth (OTP expiry, version Postgres) — via dashboard Supabase, sans migration SQL.
- Étape 8 : bucket storage public listable + policy RLS `USING (true)` restantes.
