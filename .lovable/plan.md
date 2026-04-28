## Modification de l'impression liste SAV

**Fichier**: `src/utils/pdfGenerator.ts` (fonction `generateSAVListPDF`, ~ligne 1012-1020)

### Problèmes actuels
- L'IMEI est affiché tronqué à 8 caractères avec `...` dans la colonne "Appareil"
- Le SKU n'apparaît pas du tout dans le tableau
- Position non optimale (collés à l'appareil)

### Changements

**Colonne "N° Dossier"** : afficher le numéro de dossier puis, en dessous, l'IMEI complet et le SKU complet (si présents) en petits caractères.

```html
<td class="case-number">
  ${savCase.case_number}
  ${savCase.device_imei ? `<br><small class="ref-line">IMEI: ${savCase.device_imei}</small>` : ''}
  ${savCase.sku ? `<br><small class="ref-line">SKU: ${savCase.sku}</small>` : ''}
</td>
```

**Colonne "Appareil"** : retirer l'IMEI tronqué (`imeiHTML` supprimé) — ne garder que marque + modèle.

**CSS** : ajouter une classe `.ref-line` pour garantir que l'IMEI/SKU ne soient pas tronqués :
- `font-size: 9px`
- `word-break: break-all`
- `white-space: normal`
- `display: block`
- couleur grise discrète

**Largeur colonne N° Dossier** : augmentée de `12%` à `15%` pour laisser la place aux références ; "Problème" réduite à `17%`.

Aucune autre logique modifiée.