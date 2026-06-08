## Objectif

1. Permettre d'archiver un devis **refusé** ou **accepté par le client** pour faire disparaître les badges du menu (les badges Sidebar excluent déjà `archived`).
2. Distinguer visuellement dans l'onglet **Archives** l'origine du devis (accepté / refusé / simplement archivé) en respectant le code couleur déjà utilisé (vert / orange / gris).

Aucune modification de schéma : les colonnes `accepted_at`, `rejected_at`, `rejection_reason` existent déjà et permettent de déduire l'origine.

---

## 1. `src/pages/Quotes.tsx` — Carte de devis active

- Retirer la condition qui masque le bouton **Archiver** quand `status === 'rejected'` (ligne 668). Le bouton sera visible pour tous les devis non archivés, y compris `rejected`, `accepted`, `sms_accepted`.
- Effet : un clic sur **Archiver** sur un devis refusé/accepté retire instantanément le badge correspondant dans la sidebar.

## 2. `src/pages/Quotes.tsx` — Cartes de l'onglet Archives (lignes 922-966)

Ajouter une indication visuelle d'origine en réutilisant le code couleur du reste de l'app :

- **Bordure gauche colorée** sur la `Card` (4px) :
  - vert (`border-l-green-500`) si `accepted_at` présent (accepté magasin ou client)
  - orange (`border-l-orange-500`) si `rejected_at` présent
  - gris (`border-l-muted`) sinon (archivage simple depuis brouillon/envoyé)
- **Badge d'origine** ajouté à côté du badge « Archivé » :
  - `Accepté par le client` (vert) si `accepted_by === 'client'` ou statut précédent `sms_accepted`
  - `Accepté` (vert) si `accepted_by === 'shop'`
  - `Refusé` (orange) + motif traduit (`too_expensive` → trop cher, `too_slow` → délai, `no_trust` → confiance, `postponed` → reporté) si `rejected_at`
  - Sinon, pas de badge supplémentaire
- Ajouter une ligne d'information sous le total : date d'acceptation ou de refus + motif quand disponible.

## 3. Aucun autre changement

- Sidebar inchangée (les compteurs excluent déjà `archived`).
- Pas de migration DB.
- Pas de toucher à la logique métier d'`archiveQuote` (libération des pièces réservées conservée).
