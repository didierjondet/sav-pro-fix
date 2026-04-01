

## Plan : Corriger le QR code affiché dans le dossier SAV

### Diagnostic

Le QR code dans la section "Détails du dossier" (`SAVDetail.tsx` ligne 586) utilise `generateFullTrackingUrl()` qui génère une URL basée sur `window.location.origin` (= l'URL Lovable preview). Le QR code imprimé sur papier utilise `generateShortTrackingUrl()` qui produit `fixway.fr/track/slug` (la bonne URL publique).

### Correction

**Fichier : `src/pages/SAVDetail.tsx`**

1. Importer `generateShortTrackingUrl` depuis `trackingUtils`
2. Modifier `generateTrackingUrl()` (ligne 126-129) pour utiliser `generateShortTrackingUrl` au lieu de `generateFullTrackingUrl`
3. Cela corrige automatiquement le QR code inline (ligne 586), le bouton QR code (ligne 131), et le lien copié (ligne 141)

Résultat : le QR code affiché dans le dossier SAV pointera vers `fixway.fr/track/slug`, identique au document papier.

### Fichier impacté
- `src/pages/SAVDetail.tsx` — 2 lignes modifiées (import + fonction)

