# Badge rond RDV visible sur les cartes SAV

Objectif : rendre immédiatement visible un rendez-vous programmé sur chaque carte SAV concernée, sans modifier la logique agenda ni le contenu des dossiers.

## Constat

- Le badge actuel existe dans le code, mais il est trop discret : il est placé dans les métadonnées ou entre deux lignes compactes.
- La récupération RDV doit rester robuste pour les rendez-vous liés directement au SAV (`sav_case_id`) ou seulement au client (`customer_id`).
- Le cas actuellement présent en base montre un RDV futur confirmé relié au client, avec `sav_case_id` vide : le badge doit donc pouvoir s’afficher via le client.

## Changement prévu

### 1. Fiabiliser la sélection du prochain RDV

- Garder la recherche des rendez-vous actifs futurs : `proposed`, `confirmed`, `counter_proposed`.
- Conserver la priorité : RDV lié au dossier SAV en premier, puis RDV lié au client si aucun RDV direct n’existe.
- S’assurer que la correspondance par client remonte bien le prochain rendez-vous.

### 2. Remplacer l’ancien badge discret par un badge rond visible

Sur les cartes SAV, ajouter un badge rond/compact très visible, positionné sur la carte :

```text
┌───────────────────────────────┐
│ Client / SAV            ┌────┐ │
│ Appareil                │23/05│ │
│ Métadonnées             │10:00│ │
│                         └────┘ │
└───────────────────────────────┘
```

- Format principal : jour/mois + heure, par exemple `23/05` et `10:00`.
- Icône calendrier discrète en haut du badge.
- Couleur selon statut :
  - confirmé : ton vert
  - proposé / contre-proposé : ton ambre
- Badge présent en vue standard et en vue compacte.
- Ne pas modifier les autres badges, boutons, filtres ou actions des cartes.

### 3. Garder l’information détaillée sans encombrer

- Tooltip au survol du badge rond : type de RDV, durée, statut.
- Aucun clic ou navigation ajouté.

## Hors scope

- Pas de changement sur la page Agenda.
- Pas de changement sur la création/modification des rendez-vous.
- Pas de migration base de données.
- Pas de refonte des cartes SAV au-delà du badge RDV.
