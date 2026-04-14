

## Plan : Wizard etape-par-etape pour nouveau SAV en vue simplifiee

### Concept

En mode simplifie, le bouton "Nouveau dossier SAV" ouvre un **Dialog plein ecran mobile** avec un assistant pas-a-pas (stepper). Chaque etape presente un seul groupe de champs avec des boutons Retour/Suivant. Une barre de progression en haut indique la progression.

### Etapes du wizard

Le formulaire SAV actuel contient 7 sections numerotees. Le wizard les reprend en etapes simplifiees :

1. **Type de SAV** -- selection du type + statut initial
2. **Client** -- recherche client existant ou saisie rapide (nom, prenom, telephone) -- conditionnelle selon le type
3. **Appareil** -- marque, modele, couleur, grade
4. **Probleme** -- description du probleme + photos
5. **Accessoires & Codes** -- checkboxes accessoires + codes de securite
6. **Pieces** -- ajout rapide de pieces (recherche stock + pieces libres)
7. **Recapitulatif** -- resume de tout avant validation + acompte

Chaque etape a un titre, une icone, et des boutons Retour / Suivant. L'etape finale affiche "Creer le dossier".

### Architecture technique

**Nouveau composant : `src/components/sav/SAVWizardDialog.tsx`**
- Dialog (`max-w-2xl`, plein ecran sur mobile)
- State interne : `currentStep`, meme states que `SAVForm` (customerInfo, deviceInfo, etc.)
- Barre de progression avec `Progress` component + indicateur d'etape (ex: "Etape 2/7")
- Animation de transition entre etapes (simple fade CSS)
- Reutilise les memes hooks (`useSAVCases`, `useCustomers`, `useShopSAVTypes`, etc.) et la meme logique de soumission que `SAVForm`
- Reutilise `CustomerSearch`, `PatternLock`, `FileUpload`, `SecurityCodesSection` existants
- Apres creation : affiche le `PrintConfirmDialog` existant puis ferme le wizard

**Modification : `src/pages/SAVList.tsx`**
- Detecter le mode simplifie (`localStorage.getItem('fixway_simplified_view') === 'true'`)
- Si simplifie : `handleNewSAV` ouvre le wizard dialog au lieu de naviguer vers `/sav/new`
- Ajouter le state `showWizard` et rendre `<SAVWizardDialog />`

### Detail visuel

```text
┌─────────────────────────────────┐
│  Nouveau SAV          Etape 2/7 │
│  ████████░░░░░░░░░░░░░░░░░░░░░ │
│                                  │
│  👤 Informations Client          │
│                                  │
│  [Rechercher un client...]       │
│  Prenom: [________]             │
│  Nom:    [________]             │
│  Tel:    [________]             │
│                                  │
│  [← Retour]          [Suivant →] │
└─────────────────────────────────┘
```

### Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/sav/SAVWizardDialog.tsx` | Nouveau |
| `src/pages/SAVList.tsx` | Modifie (condition vue simplifiee) |

### Ce qui ne change pas

- Le formulaire SAV classique (`SAVForm`) reste inchange pour le mode normal
- La page `/sav/new` continue de fonctionner normalement
- La logique de creation (insertion en base, gestion des pieces, commandes auto) est repliquee depuis `SAVForm`

