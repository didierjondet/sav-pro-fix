

## Switch "Vue simplifiée" dans le Header

### Fonctionnement

Un toggle switch dans le header (zone droite, avant les icônes) permet de basculer entre vue complète et vue simplifiée. L'état est stocké en `localStorage` (clé `fixway_simplified_view`), donc indépendant par navigateur/ordinateur.

### Vue simplifiée active

**Sidebar** : affiche uniquement :
- Dossiers SAV
- Devis
- Agenda
- Chat clients
- Section "Types de SAV" (conservée)
- Section "SAV en retard" (conservée)
- Masque : Tableau de bord, Stock pièces, Commandes, Clients, Rapports, Statuts SAV

**Redirection** : quand le switch est activé, redirection automatique vers `/sav` (page d'atterrissage par défaut).

### Modifications fichiers

1. **`src/components/layout/Header.tsx`**
   - Ajouter un switch avec label "Vue simplifiée" dans la zone droite (avant le bouton sync)
   - Lire/écrire `localStorage` key `fixway_simplified_view`
   - Au toggle ON : `navigate('/sav')`
   - Passer l'état via un événement `storage` pour synchroniser avec la Sidebar

2. **`src/components/layout/Sidebar.tsx`**
   - Lire l'état `localStorage` `fixway_simplified_view`
   - Écouter l'événement custom `simplifiedViewChanged` pour réagir en temps réel
   - Quand actif, filtrer `navigation` pour ne garder que `/sav`, `/quotes`, `/agenda`, `/client-chats`
   - Masquer la section "Statuts SAV" (`sidebar_sav_statuses`)
   - Conserver "Types de SAV" et "SAV en retard"

3. **`src/pages/Index.tsx`**
   - Au montage, si `localStorage` `fixway_simplified_view` === `'true'`, rediriger vers `/sav`

