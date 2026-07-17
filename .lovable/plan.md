## Modification — Impression SAV côte à côte

### Objectif
Afficher les deux exemplaires (souche magasin + volet client) **côte à côte sur une seule feuille A4 paysage**, au lieu de l'un en dessous de l'autre. Cela évite les débordements sur 2 pages quand le contenu est un peu long et améliore la lisibilité.

### Changements dans `src/components/sav/SAVPrint.tsx`

1. **Format d'impression** : `@page { size: A4 landscape; margin: 0.8cm; }` au lieu de portrait.
2. **Conteneur `.dual-content`** :
   - Passe en `flex-direction: row` (au lieu de `column`).
   - `gap: 12px`, `align-items: flex-start`.
3. **Blocs `.content-block`** :
   - `width: calc(50% - 12px)` chacun, avec `page-break-inside: avoid` pour rester d'un seul tenant.
4. **Trait de découpe `.cut-line`** :
   - Devient une barre verticale (largeur 1px, hauteur 100%) au centre, avec l'icône ciseaux tournée à 90°.
5. **Ajustements mineurs** :
   - Réduire légèrement les marges internes des tableaux et images (QR / code-barres) si nécessaire pour tenir dans la moitié de largeur paysage.
   - Aucune modification du contenu affiché : mêmes blocs (client, appareil, description, pièces, prêt, historique, pièces jointes, QR).

### Hors périmètre
Aucun changement métier, aucun changement sur les autres PDF (restitution, étiquettes, devis) ni sur les composants React.
