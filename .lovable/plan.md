## Problème

L'enregistrement dans Réglages → Types de SAV échoue car le code (`SAVTypesManager.tsx`, `useShopSAVTypes.ts`, formulaire de prêt) insère/update la colonne `loaner_enabled` dans la table `shop_sav_types`, mais cette colonne **n'existe pas en base**. PostgREST renvoie alors une erreur "column does not exist" qui bloque la sauvegarde.

La table contient actuellement : id, shop_id, type_key, type_label, type_color, display_order, is_default, is_active, show_customer_info, max_processing_days, pause_timer, show_in_sidebar, alert_days, require_unlock_pattern, exclude_from_stats, exclude_purchase_costs, exclude_sales_revenue, show_satisfaction_survey, enable_restitution_pdf — **mais pas `loaner_enabled`**.

Aucune migration historique n'a ajouté cette colonne (recherche `loaner_enabled` dans `supabase/migrations/` → vide).

## Correction

Migration unique :

```sql
ALTER TABLE public.shop_sav_types
  ADD COLUMN IF NOT EXISTS loaner_enabled boolean NOT NULL DEFAULT false;
```

Aucun changement de code frontend nécessaire — les composants utilisent déjà `loaner_enabled` et fonctionneront dès que la colonne existera.

## Vérification

- Ouvrir Réglages → Types de SAV, modifier un type, enregistrer → succès attendu.
- Création d'un nouveau type → succès attendu.
