## Objectif

Ajouter codes-barres (Code 128) sur les fiches produit + transformer le téléphone en scanner caméra pour des sessions d'inventaire en comptage cumulatif, le tout pensé mobile-first et ergonomique.

## 1. Codes-barres sur les fiches produit

- Dépendances : `bwip-js` (génération Code 128 SVG/Canvas, léger, sans dépendance native).
- Source du code = le `sku` de la pièce. Si le SKU est vide, fallback sur la `reference`. Si les deux sont vides : message « Définissez un SKU pour générer le code-barres ».
- Nouveau composant `src/components/parts/PartBarcode.tsx` : rend un Code 128 + libellé SKU en dessous.
- Intégration dans `PartForm.tsx` : bloc « Code-barres » sous la zone SKU avec :
  - Aperçu du code 128.
  - Bouton **« Imprimer l'étiquette »** → ouvre une fenêtre d'impression A4 minimale (1 étiquette format ~50×30 mm centrée) avec nom produit + SKU + code-barres. Aucune planche multi-étiquettes (conforme au choix).
  - Bouton **« Télécharger PNG »** pour usage externe.

## 2. Module Scanner (réutilisable)

- Dépendance : `@zxing/browser` (lecture Code 128 / EAN / QR via `getUserMedia`, maintenue, compatible iOS Safari).
- Nouveau composant `src/components/inventory/BarcodeScannerDialog.tsx` :
  - Plein écran sur mobile, dialog sur desktop.
  - Sélection caméra arrière par défaut (`facingMode: environment`), bouton bascule avant/arrière.
  - Overlay viseur + bip sonore + vibration courte à chaque scan détecté.
  - Mode **« scan continu »** : ne ferme pas le dialog après un scan, enchaîne les lectures (essentiel pour le comptage cumulatif).
  - Debounce 800 ms par code identique pour éviter les doubles lectures.
  - Champ de saisie clavier intégré (fallback si pas de caméra ou pour douchette USB/BT future).
  - Callback `onScan(code: string)`.

## 3. Inventaire — comptage cumulatif par scan

Refonte ergonomique de la session d'inventaire en mode « Scan » (le mode existe déjà dans `InventoryMode`, on le rend pleinement opérationnel).

### Nouveau composant `InventoryScanMode.tsx`
- Bouton géant « 📷 Démarrer le scan » → ouvre `BarcodeScannerDialog` en mode continu.
- À chaque scan d'un SKU :
  1. Recherche la ligne `inventory_session_items` correspondante (match sur `part_sku`, fallback sur `part_reference`).
  2. Incrémente `counted_quantity` de +1 (RPC dédié, voir §4).
  3. Toast court + bip + vibration → l'utilisateur enchaîne sans toucher l'écran.
  4. SKU inconnu dans la session : toast d'avertissement + proposition « Ajouter à la session » (si la pièce existe en stock).
- Panneau latéral / inférieur live :
  - Compteur global « X / Y comptés ».
  - 5 derniers scans avec nom, SKU, nouveau compteur (avec bouton -1 d'annulation rapide pendant 10 s).
- Bouton **« Saisie manuelle »** ouvre le clavier numérique pour ajuster une ligne précise (réutilise éditeur existant).
- Bouton **« Pause / Reprendre »** branché sur les statuts existants.

### Intégration dans `InventoryManager`
- Onglet « Scan » mis en avant comme mode principal sur mobile (détection viewport).
- Sur desktop : les 3 modes (Assisté / Scan / Manuel) restent disponibles.

## 4. Backend (migration)

- RPC `public.inventory_scan_increment(session_id uuid, code text, delta int default 1)` (SECURITY DEFINER, `search_path = public`) :
  - Vérifie que la session appartient au shop de l'utilisateur courant.
  - Trouve la ligne (`part_sku = code` OR `part_reference = code`), met `line_status = 'found'`, ajoute `delta` à `counted_quantity`, met `counted_at = now()`, `entry_method = 'scan'`, `last_scanned_code = code`, `scan_count = scan_count + 1`.
  - Renvoie la ligne mise à jour (ou code d'erreur structuré `{ status: 'not_found' | 'ok', item? }`).
- GRANT EXECUTE à `authenticated` uniquement.
- Aucun changement de schéma sur `parts` ni `inventory_session_items` (les colonnes nécessaires existent déjà : `entry_method`, `last_scanned_code`, `scan_count`).

## 5. Détails techniques

- Installation : `bun add bwip-js @zxing/browser`.
- iOS Safari : la caméra nécessite HTTPS + interaction utilisateur → le bouton « Démarrer le scan » respecte ce flow.
- Aucune sortie directe de stock (mode « vidange ») n'est implémentée — conforme au choix « comptage cumulatif » seul. L'application des écarts au stock réel reste gérée par le bouton existant « Appliquer l'inventaire » en fin de session.
- Aucune modification des fonctionnalités validées (UI fiche produit conservée, ajout d'un bloc dédié seulement ; modes d'inventaire existants conservés).

## Fichiers impactés

- Nouveaux : `src/components/parts/PartBarcode.tsx`, `src/components/inventory/BarcodeScannerDialog.tsx`, `src/components/settings/inventory/InventoryScanMode.tsx`.
- Modifiés : `src/components/parts/PartForm.tsx` (bloc code-barres), `src/components/settings/inventory/InventoryManager.tsx` / `InventorySessionTab.tsx` (onglet Scan opérationnel).
- Migration : RPC `inventory_scan_increment`.
- `package.json` : ajout `bwip-js`, `@zxing/browser`.
