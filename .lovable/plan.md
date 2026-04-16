

## Plan : Correction du bug de reservations fantomes + validation wizard

### 1. Migration SQL : Corriger le trigger

Le trigger `handle_sav_completion_stock` filtre `OLD.status IN ('pending', 'in_progress', 'parts_ordered', 'testing')` ce qui exclut `parts_to_order` et les statuts personnalises. Toute transition vers `ready` ou `cancelled` depuis ces statuts oublies ne libere jamais les reservations.

**Correction** : supprimer le filtre sur `OLD.status`. Liberer les reservations pour TOUTE transition vers `ready` ou `cancelled`, quelle que soit l'origine :

```sql
IF NEW.status = 'ready' AND OLD.status <> 'ready' THEN ...
IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN ...
```

### 2. Migration SQL : Nettoyage des 35 pieces buguees

Recalculer `reserved_quantity` pour TOUTES les pieces en se basant sur les `sav_parts` lies a des SAV encore actifs :

```sql
UPDATE parts SET reserved_quantity = COALESCE(
  (SELECT SUM(sp.quantity) FROM sav_parts sp 
   JOIN sav_cases sc ON sp.sav_case_id = sc.id
   WHERE sp.part_id = parts.id 
   AND sc.status NOT IN ('ready','delivered','cancelled')),
  0
);
```

Cela remet a zero les reservations fantomes et corrige les 35 pieces identifiees d'un coup.

### 3. Validation du wizard (SAVWizardDialog.tsx)

Ajouter une fonction `canProceed()` qui desactive le bouton "Suivant" si les champs obligatoires ne sont pas remplis :

- **Etape Client** (si `show_customer_info`) : nom + prenom + (telephone ou email) -- OU client selectionne
- **Etape Appareil** : marque et modele requis
- **Etape Probleme** : description requise
- Les autres etapes restent optionnelles

Afficher un message d'aide en rouge sous le bouton quand la validation echoue.

### Fichiers concernes

| Fichier | Action |
|---------|--------|
| Migration SQL #1 | Nouveau (fix trigger) |
| Migration SQL #2 | Nouveau (nettoyage donnees) |
| `src/components/sav/SAVWizardDialog.tsx` | Modifie (validation par etape) |

### Ce qui N'est PAS fait

Pas d'interface admin pour corriger manuellement les reservations -- le nettoyage est fait en une seule migration.

