## Problème

Sur `/m/sav` (et partout où `BarcodeScannerDialog` est utilisé), le viseur s'affiche mais aucune détection ne se déclenche, et il n'y a pas de bouton de validation manuelle du flux vidéo.

## Causes probables identifiées dans `src/components/inventory/BarcodeScannerDialog.tsx`

1. **Perte du contexte de geste utilisateur (cause principale sur mobile)**
   Aujourd'hui : clic → `setScannerOpen(true)` → montage du dialog → `useEffect` async → `listVideoInputDevices()` → `decodeFromVideoDevice()`. Tous les `await` avant l'ouverture de la caméra cassent le contexte de geste, ce qui fait échouer silencieusement `getUserMedia` sur Safari iOS et certaines versions de Chrome Android. Résultat : le `<video>` reste noir/figé, aucun frame n'est décodé, aucune erreur visible.

2. **Aucun `getUserMedia` explicite avant l'énumération**
   `listVideoInputDevices()` ne renvoie les `label` (utilisés pour détecter la caméra arrière) que si la permission caméra a déjà été accordée. Sans appel explicite préalable, on peut se retrouver avec un `deviceId` invalide, et `decodeFromVideoDevice` ne démarre jamais réellement le flux.

3. **Pas de fallback ni de feedback**
   Si `decodeFromVideoDevice` échoue silencieusement, l'utilisateur voit uniquement le viseur sans indication ni bouton de secours.

## Correctifs prévus (uniquement `BarcodeScannerDialog.tsx`)

1. **Démarrer la caméra dans le geste d'ouverture**
   - Exposer une méthode ou déclencher `getUserMedia({ video: { facingMode: 'environment' } })` immédiatement à l'ouverture, puis attacher le stream au `<video>` avant de lancer le décodage ZXing (`decodeFromStream` / `decodeFromVideoElement`) au lieu de `decodeFromVideoDevice`. Cela évite la chaîne d'`await` bloquante.
   - Énumérer les devices après avoir obtenu la permission (les `label` seront alors disponibles pour détecter correctement la caméra arrière).

2. **Gestion d'erreurs explicite**
   - Afficher clairement les erreurs `NotAllowedError` (permission refusée), `NotFoundError` (pas de caméra), et contexte non sécurisé (HTTP au lieu de HTTPS).
   - Ajouter un bouton « Réessayer » qui relance proprement le flux dans un nouveau geste utilisateur.

3. **Bouton de validation / capture manuelle**
   - Ajouter un bouton « Capturer maintenant » qui force un décodage ponctuel de l'image courante via `decodeFromCanvas` (ZXing), utile quand l'auto-détection peine (mauvaise lumière, code abîmé).
   - Conserver la saisie manuelle existante inchangée.

4. **Cycle de vie propre**
   - À la fermeture du dialog ou changement de caméra : `stop()` les contrôles ZXing et couper les tracks du `MediaStream` pour libérer la caméra.

## Ce qui ne change pas

- Aucun changement d'UI hors du dialog scanner.
- Aucun changement de logique dans `MobileSAVLookup.tsx`, ni dans les autres appelants du scanner.
- Le format d'appel `onScan(code)` reste identique.
