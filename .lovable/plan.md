## Objectif

Unifier et renforcer la mise en évidence visuelle de la zone "Description du problème" partout dans le module SAV (vue normale uniquement — la vue simplifiée / wizard reste inchangée car déjà segmentée par étape).

## Constat actuel

| Emplacement | État actuel |
|---|---|
| `SAVForm.tsx` (nouveau SAV vue normale) | Champ neutre, sans encadré — **non mis en évidence** |
| `SAVDetail.tsx` (consultation d'un SAV) | Encadré léger (border-l-4 + bg-primary/5) — **trop discret** |
| `EditSAVDetailsDialog.tsx` (édition) | Champ neutre — **non mis en évidence** |
| `SAVWizardDialog.tsx` (vue simplifiée) | Déjà mis en évidence — **on ne touche pas** |

## Plan

### 1. Créer un composant réutilisable

Nouveau fichier `src/components/sav/ProblemDescriptionHighlight.tsx` exportant deux composants :

- `<ProblemDescriptionField>` — wrapper de champ pour les formulaires (création / édition). Contient le label, l'icône, le bouton de reformulation IA (slot enfant) et le `Textarea` (slot enfant).
- `<ProblemDescriptionDisplay>` — bloc d'affichage en lecture seule (vue détail).

Les deux partagent la même identité visuelle renforcée :

- Bordure gauche épaisse `border-l-[6px] border-l-primary`
- Bordure complète subtile `border border-primary/20`
- Fond dégradé doux `bg-gradient-to-br from-primary/10 via-primary/5 to-transparent`
- Léger `ring-1 ring-primary/20` + `shadow-md`
- Bandeau d'en-tête : icône `AlertCircle` dans un cercle plein `bg-primary text-primary-foreground`, titre en `text-base font-bold uppercase tracking-wide`, petit badge "Information clé" à droite
- Padding généreux (`p-5`) et coins arrondis `rounded-xl`
- Pour le `Textarea` interne : fond blanc/card opaque pour bon contraste sur le fond teinté, `min-h-[110px]`, focus ring renforcé

### 2. Intégrations

- **`SAVForm.tsx`** (lignes ~731-752) : remplacer le bloc `<div><Label/><Textarea/></div>` par `<ProblemDescriptionField>` qui héberge le `AITextReformulator` et le `Textarea` existants (mêmes props / handlers, aucun changement de logique).
- **`SAVDetail.tsx`** (lignes ~557-565) : remplacer l'encadré actuel par `<ProblemDescriptionDisplay value={savCase.problem_description} />` — conserve `md:col-span-2`.
- **`EditSAVDetailsDialog.tsx`** (lignes ~188-197) : envelopper le `Textarea` "Description du problème" dans `<ProblemDescriptionField>` (sans bouton IA, juste le textarea).
- **`SAVWizardDialog.tsx`** : **aucune modification** (vue simplifiée exclue).

### 3. Cohérence design system

- Toutes les couleurs via tokens sémantiques (`primary`, `primary-foreground`, `card`, `foreground`, `muted-foreground`).
- Aucune couleur HSL en dur dans les composants.
- Compatible thèmes clair / sombre.

## Détails techniques

Squelette du composant partagé :

```tsx
// ProblemDescriptionHighlight.tsx
export function ProblemDescriptionField({ children, action, required }) {
  return (
    <div className="rounded-xl border border-primary/20 border-l-[6px] border-l-primary
                    bg-gradient-to-br from-primary/10 via-primary/5 to-transparent
                    ring-1 ring-primary/20 shadow-md p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <AlertCircle className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-bold tracking-wide">
              Description du problème {required && <span className="text-destructive">*</span>}
            </h3>
            <p className="text-xs text-muted-foreground">Information clé du dossier</p>
          </div>
        </div>
        {action /* AITextReformulator */}
      </div>
      <div className="[&_textarea]:bg-card [&_textarea]:border-primary/30
                      [&_textarea]:focus-visible:ring-primary [&_textarea]:min-h-[110px]">
        {children /* Textarea */}
      </div>
    </div>
  );
}
```

`ProblemDescriptionDisplay` réutilise exactement le même chrome avec un `<p className="text-foreground whitespace-pre-wrap leading-relaxed">` à la place du `Textarea`.

## Fichiers impactés

- **Créé** : `src/components/sav/ProblemDescriptionHighlight.tsx`
- **Modifié** : `src/components/sav/SAVForm.tsx`
- **Modifié** : `src/pages/SAVDetail.tsx`
- **Modifié** : `src/components/sav/EditSAVDetailsDialog.tsx`
- **Inchangé** : `src/components/sav/SAVWizardDialog.tsx` (vue simplifiée)
