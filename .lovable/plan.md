## Diagnostic

Dans `src/components/parts/PartForm.tsx`, les champs **Prix d'achat HT** et **Prix public TTC** utilisent `<NumberInput>` (composant **contrôlé** via un state interne, `src/components/ui/number-input.tsx` L33/L91) combiné à `{...register('purchase_price', { valueAsNumber: true })}` de react-hook-form.

Problème : `register()` ne renvoie pas de prop `value`, seulement `{ onChange, onBlur, ref, name }`. Or NumberInput est strictement contrôlé (`value={internal}` avec `internal` initialisé depuis `externalToDisplay(value)` = `""` quand `value` est `undefined`). React écrase donc systématiquement la valeur que RHF tente d'écrire via le ref avec `defaultValues`. Résultat : le champ s'affiche vide / 0 à l'ouverture, alors que la donnée existe bien dans le state RHF (et la card l'affiche correctement). Le comportement intermittent observé vient d'un effet de race entre l'écriture ref RHF et le premier render contrôlé de React.

Les autres NumberInput (`quantity`, `min_stock`, `time_minutes`, `labor_cost`) ont le même problème théorique, mais l'utilisateur ne remarque pas parce qu'ils valent souvent 0 par défaut. **Hors scope** : on ne touche qu'aux deux champs de prix conformément à la demande.

## Correctif

Remplacer `register()` par `<Controller>` (RHF) pour les deux NumberInput de prix, afin de passer une vraie prop `value` à NumberInput.

### Fichier modifié

**`src/components/parts/PartForm.tsx`** uniquement.

1. Ajouter `control` au retour de `useForm()` (L56-L77).
2. Importer `Controller` depuis `react-hook-form`.
3. Remplacer (L306-L313 et L329-L337) :

```tsx
<NumberInput
  id="purchase_price"
  step="0.01"
  min="0"
  {...register('purchase_price', { valueAsNumber: true })}
  placeholder="0.00"
/>
```

par :

```tsx
<Controller
  name="purchase_price"
  control={control}
  render={({ field }) => (
    <NumberInput
      id="purchase_price"
      step="0.01"
      min="0"
      placeholder="0.00"
      value={field.value ?? 0}
      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
      onBlur={field.onBlur}
      ref={field.ref}
    />
  )}
/>
```

Idem pour `selling_price` (en conservant `readOnly={useMargin}`).

## Hors scope

- Pas de modification de NumberInput, ni des autres champs (quantity, min_stock, time_minutes, labor_cost).
- Pas de changement visuel, ni de logique métier, ni de DB, ni du hook `useParts`.
- Pas de modification du layout, marges, labels ou aide affichée.
