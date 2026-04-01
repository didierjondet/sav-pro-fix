

## Plan : Refonte de la card SAV standard pour une meilleure lisibilité

### Problemes actuels
- Tout est sur une seule ligne horizontale compactee (nom, statut, badges, date, type SAV)
- Sur ecran 13 pouces, les elements debordent ou se tassent
- Le SKU est affiche deux fois (lignes 628-633 et 635-641)
- La grille `md:grid-cols-4` ne s'adapte pas bien aux petits ecrans
- Les boutons d'action sont colles a droite sans separation claire
- La description et la timeline sont coincees en bas sans hierarchie visuelle

### Nouvelle organisation proposee

```text
┌─────────────────────────────────────────────────────────┐
│  LIGNE 1 : Identite                                     │
│  💬 🔴 DUPONT Jean          N° 1042    Badge type SAV   │
│                                                          │
│  LIGNE 2 : Appareil + Statut                            │
│  📦 iPhone 13 Pro  |  IMEI: xxx  |  [En cours ▼]       │
│                                                          │
│  LIGNE 3 : Metadonnees (badges clairs, espaces)         │
│  📅 Cree le 15/03  ⏱ 2j restants  👁 3 visites         │
│  SKU: ABC123 (si present)                                │
│                                                          │
│  LIGNE 4 : Description                                   │
│  Ecran casse suite a une chute...                        │
│                                                          │
│  ── separateur ──                                        │
│  LIGNE 5 : Timeline                                      │
│                                                          │
│  ── separateur ──                                        │
│  LIGNE 6 : Actions (alignees a droite)                   │
│  [👁 Voir]  [🖨 Imprimer]  [🗑 Supprimer]              │
└─────────────────────────────────────────────────────────┘
```

### Changements concrets dans `src/pages/SAVList.tsx`

1. **Ligne 1 — Identite** : nom client en `text-lg font-bold`, numero de dossier et badge type SAV alignes a droite. Icone message non lu a gauche du nom.

2. **Ligne 2 — Appareil + Statut** : appareil (marque/modele), IMEI si present, dropdown statut. Layout `flex-wrap` pour s'adapter aux petits ecrans.

3. **Ligne 3 — Metadonnees** : date de creation, delai restant (colore selon urgence), compteur de visites, SKU si present. Affiche en `flex flex-wrap gap-3` avec des badges legers. Suppression du doublon SKU.

4. **Ligne 4 — Description** : texte `line-clamp-2` inchange.

5. **Ligne 5 — Timeline** : separateur + timeline inchangee.

6. **Ligne 6 — Actions** : nouveau separateur, boutons alignes a droite au lieu d'etre colles dans la marge. Sur mobile, les boutons passent en `flex-wrap`.

7. **Structure globale** : passer de `flex items-center justify-between` (horizontal) a une structure verticale `flex flex-col` avec des sections clairement separees. Le padding passe de `p-6` a `p-4 md:p-5` pour mieux respirer sur petit ecran.

### Fichier impacte
- `src/pages/SAVList.tsx` — section vue standard (lignes 572-698)

