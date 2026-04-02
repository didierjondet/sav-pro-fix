

## Plan : Refonte esthetique des cartes SAV + correction icone telephone

### Probleme identifie
1. **Vue standard** : le type SAV est en haut a droite, le statut est sous l'appareil — disposition a revoir
2. **Fond des cartes** : toutes les cartes ont `bg-sky-50` au lieu d'utiliser la couleur du type SAV
3. **Vue compacte (grille)** : meme probleme de fond uniforme
4. **Bug icone telephone** : l'IMEI (ligne 614-618) est affiche avec une icone `Phone` — il faut n'afficher l'icone telephone que si le client a un numero de telephone, et afficher l'IMEI avec une icone differente

### Modifications prevues

**Fichier : `src/pages/SAVList.tsx`**

#### Vue standard (lignes 572-703)

1. **Fond de card colore par type SAV** : remplacer `bg-sky-50` par un fond dynamique base sur `getTypeInfo(savCase.sav_type).color` avec opacite legere (~15%)
2. **Deplacer le badge type SAV** en bas a gauche de la card (dans la zone actions, cote gauche)
3. **Remonter le statut dropdown** a la place du type SAV (coin haut droit, ligne 1)
4. **Disposition des 4 coins** :
   - Haut gauche : nom client + icones (inchange)
   - Haut droit : statut dropdown (remonte)
   - Bas gauche : badge type SAV (deplace)
   - Bas droit : boutons actions (inchange)
5. **Correction icone IMEI** : remplacer l'icone `Phone` par une icone appropriee (ex: `Hash` ou `Barcode`) pour l'IMEI, et n'afficher l'icone `Phone` que si `savCase.customer?.phone` existe

#### Vue compacte/grille (lignes 506-569)

6. **Fond colore par type SAV** : meme logique de fond dynamique
7. **Deplacer le badge type** en bas a gauche
8. **Correction coherente** de l'affichage telephone/IMEI si present

### Detail technique

- Couleur de fond : `style={{ backgroundColor: getTypeInfo(savCase.sav_type).color + '15' }}` (hex avec 15% opacite)
- Le badge type SAV utilise deja `getTypeStyle()` qui retourne la bonne couleur
- Pour l'IMEI, utiliser l'icone `Hash` de lucide-react au lieu de `Phone`
- Ajouter conditionnellement l'icone `Phone` uniquement si `savCase.customer?.phone` est renseigne

### Fichiers impactes
- `src/pages/SAVList.tsx` — seul fichier a modifier

