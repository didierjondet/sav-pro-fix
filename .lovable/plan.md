## Objectif

Mettre visuellement en évidence le bloc « Description du problème » à deux endroits :
1. **Wizard nouveau SAV** — étape `problem` dans `SAVWizardDialog.tsx`
2. **Détails d'un SAV** — bloc « Détail du dossier » dans `SAVDetail.tsx`

Le but : qu'on repère immédiatement ce bloc sans le chercher dans la masse d'informations.

## Direction esthétique

Encadré "carte mise en avant" avec :
- Bordure gauche épaisse colorée (accent primaire, 4px) façon Notion/Linear callout.
- Fond légèrement teinté (`bg-primary/5`) pour le détacher du fond neutre.
- Icône `AlertCircle` (lucide) à côté du titre.
- Titre en `font-semibold text-base` au lieu d'un simple Label/`<strong>`.
- Coins arrondis (`rounded-lg`), padding généreux (`p-4`).
- Texte de la description en `text-foreground` (au lieu de `text-muted-foreground` actuel sur la page détail) pour qu'il soit lisible.

Le rendu reste sobre, cohérent avec le design system shadcn déjà utilisé, et utilise uniquement les tokens sémantiques (pas de couleurs en dur).

## Détails techniques

### 1. `src/components/sav/SAVWizardDialog.tsx` — case `'problem'` (lignes 673-693)

Remplacer le wrapper neutre par une carte mise en évidence :

```tsx
<div className="rounded-lg border-l-4 border-l-primary bg-primary/5 p-4 space-y-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <AlertCircle className="h-5 w-5 text-primary" />
      <Label className="text-base font-semibold">Description du problème *</Label>
    </div>
    <AITextReformulator … />
  </div>
  <Textarea
    className="bg-background"
    value={…}
    placeholder="Décrivez le problème rencontré…"
    rows={5}
  />
</div>
<FileUpload … />
```

Ajouter `import { AlertCircle } from 'lucide-react'` si absent.

### 2. `src/pages/SAVDetail.tsx` — bloc "Détail du dossier" (lignes 557-560)

Sortir le bloc de la grille `md:col-span-2` neutre et l'afficher en carte distincte juste après les infos appareil :

```tsx
<div className="md:col-span-2 rounded-lg border-l-4 border-l-primary bg-primary/5 p-4">
  <div className="flex items-center gap-2 mb-2">
    <AlertCircle className="h-5 w-5 text-primary" />
    <h3 className="font-semibold text-base">Description du problème</h3>
  </div>
  <p className="text-foreground whitespace-pre-wrap">
    {savCase.problem_description || <span className="italic text-muted-foreground">Aucune description renseignée</span>}
  </p>
</div>
```

Importer `AlertCircle` si nécessaire (déjà utilisé ailleurs dans le fichier probablement).

### 3. Bonus cohérence

Appliquer le même traitement (callout primary) dans `SAVForm.tsx` (ligne 748) et `EditSAVDetailsDialog.tsx` (ligne 195) si l'utilisateur souhaite que la mise en évidence soit appliquée partout où le champ apparaît, pour une expérience uniforme. À confirmer ou à inclure d'office.

## Vérification

- Ouvrir le wizard de création SAV : étape Problème → carte bleutée bordure gauche, immédiatement repérable.
- Ouvrir un SAV existant : la description ressort visuellement du reste du bloc « Détail du dossier ».
- Vérifier en mode sombre que le `bg-primary/5` reste lisible (semantic tokens HSL).
