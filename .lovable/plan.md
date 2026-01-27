
# Plan : Téléchargement facile de l'extension Chrome

## Problème identifié
Le bouton "Télécharger l'extension" pointe vers `/chrome-extension` qui est un dossier, pas un fichier téléchargeable. Le navigateur ne peut pas télécharger un dossier directement.

## Solution proposée
Créer une page dédiée qui permet de télécharger tous les fichiers de l'extension Chrome de manière simple.

## Modifications à effectuer

### 1. Créer une page de téléchargement d'extension
**Fichier : `src/pages/ChromeExtensionDownload.tsx`**

Cette page affichera :
- Instructions claires pour l'installation
- Boutons pour télécharger chaque fichier individuellement
- Un bouton "Télécharger tout en ZIP" qui génère un fichier ZIP côté client
- Guide étape par étape avec captures d'écran

### 2. Ajouter la route
**Fichier : `src/App.tsx`**

Ajouter une nouvelle route `/chrome-extension-download` pour accéder à cette page.

### 3. Mettre à jour le lien de téléchargement
**Fichier : `src/components/quotes/SupplierPartsSearch.tsx`**

Modifier le bouton "Télécharger l'extension" pour rediriger vers la nouvelle page au lieu de `/chrome-extension`.

### 4. Utiliser JSZip pour la génération du ZIP
La bibliothèque `jszip` sera utilisée pour créer un fichier ZIP côté client contenant tous les fichiers de l'extension.

---

## Détails techniques

### Fichiers de l'extension à inclure dans le ZIP
- `manifest.json`
- `popup.html`
- `popup.js`
- `background.js`
- `content.js`
- `icon16.png`
- `icon48.png`
- `icon128.png`
- `README.md`

### Fonctionnement du téléchargement ZIP
1. La page charge tous les fichiers depuis `/chrome-extension/`
2. JSZip les compile en un seul fichier `.zip`
3. Le fichier est téléchargé automatiquement
4. L'utilisateur décompresse et charge dans Chrome

### Interface utilisateur de la page
```text
┌─────────────────────────────────────────────────────────────┐
│  🔧 Extension Chrome - Recherche Pièces Fournisseurs        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [📦 Télécharger l'extension (ZIP)]                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📋 Instructions d'installation :                           │
│                                                             │
│  1. Cliquez sur "Télécharger l'extension"                   │
│  2. Décompressez le fichier ZIP                             │
│  3. Ouvrez Chrome et allez à chrome://extensions            │
│  4. Activez le "Mode développeur"                           │
│  5. Cliquez sur "Charger l'extension non empaquetée"        │
│  6. Sélectionnez le dossier décompressé                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📁 Fichiers individuels (si besoin) :                      │
│  • manifest.json  [Télécharger]                             │
│  • popup.html     [Télécharger]                             │
│  • popup.js       [Télécharger]                             │
│  • ...                                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Dépendance à ajouter
- `jszip` : bibliothèque pour créer des fichiers ZIP côté client

## Résumé des fichiers modifiés/créés
| Fichier | Action |
|---------|--------|
| `src/pages/ChromeExtensionDownload.tsx` | Créer |
| `src/App.tsx` | Modifier (ajouter route) |
| `src/components/quotes/SupplierPartsSearch.tsx` | Modifier (lien) |
| `package.json` | Ajouter jszip |
