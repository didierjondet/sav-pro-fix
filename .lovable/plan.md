## Modifications

### 1. Code-barres en en-tête des impressions SAV (`src/components/sav/SAVPrint.tsx`)
Ajouter une image code-barres (code128 du `case_number`) juste sous le titre `Dossier SAV N° ...` dans les deux blocs (recto + souche), taille compacte adaptée à la largeur 50%.

### 2. Filtres par défaut de `src/pages/SAVList.tsx`
Passer les valeurs initiales à "tout afficher" (notamment `hideLoans: false`) tant qu'aucune préférence n'est stockée en localStorage. Conserver la persistance des choix utilisateur.

### 3. Suppression du statut "Annulé"
- **Migration SQL** :
  - `DELETE FROM sav_cases WHERE status = 'cancelled'` (suppression directe, conformément à la demande).
  - `DELETE FROM shop_sav_statuses WHERE status_key = 'cancelled'` pour tous les magasins.
- **Code** : retirer `cancelled` des statuts par défaut (`useShopSAVStatuses`, `useSAVStatuses`, seed éventuel), et nettoyer les références UI (badges, exclusions dans `check-sav-delays` si présentes).

## Détails techniques
- Barcode via URL image `https://barcodeapi.org/api/code128/<case_number>` ou équivalent inline (`bwip-js` non requis).
- La migration supprime en cascade via les FK existantes (sav_parts, sav_messages, sav_audit_logs, etc. — à vérifier avant lancement).
- Aucun impact realtime/RLS/logique métier hors périmètre.
