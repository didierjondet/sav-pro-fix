## Objectif

Migrer en masse les SAV du magasin **Easycash Agde** ayant le statut `ready` ("Prêt") vers `pret_et_cloture` ("Prêt et cloturé", statut final).

## Données

- Shop: Easycash Agde (`add89e6c-2bff-4799-a062-63cd0a9b33c0`)
- Statuts existants pour ce magasin:
  - `ready` → "Prêt" (non final)
  - `pret_et_cloture` → "Prêt et cloturé" (final ✅)
- **776 SAV** concernés actuellement en `ready`.

## Action

Une seule migration SQL qui:

1. Pour chaque SAV concerné, ajoute une entrée dans `closure_history` (date = `now()`, statut `pret_et_cloture`, auteur "Migration système") afin de respecter la logique de clôture du projet.
2. Met à jour `status = 'pret_et_cloture'` sur les 776 SAV.
3. Insère une ligne dans `sav_status_history` pour traçabilité.

Filtré strictement sur `shop_id = 'add89e6c-...'` et `status = 'ready'` — aucun autre magasin impacté.

## Hors périmètre

- Pas de modification de code frontend / hooks.
- Pas de suppression du statut `ready` (il reste disponible si tu veux le réutiliser plus tard).
- Pas de régénération de PDF de restitution pour ces 776 dossiers.