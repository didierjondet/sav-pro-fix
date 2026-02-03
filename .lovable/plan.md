
# Plan : Module Agenda pour la prise de rendez-vous

## Vue d'ensemble

Création d'un système complet de gestion de rendez-vous permettant :
- Aux **techniciens** : ouvrir des créneaux, gérer leur planning
- Aux **clients** : recevoir des propositions de RDV et confirmer/proposer un autre créneau
- **Communication** : via SAV (chat), SMS ou les deux

---

## Architecture technique

### 1. Nouvelles tables de base de données

```text
┌─────────────────────────────────────────┐
│        shop_working_hours               │
├─────────────────────────────────────────┤
│ id (uuid)                               │
│ shop_id (fk → shops)                    │
│ day_of_week (0-6, dimanche=0)           │
│ start_time (time)                       │
│ end_time (time)                         │
│ is_open (boolean)                       │
│ break_start (time, nullable)            │
│ break_end (time, nullable)              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│        appointments                     │
├─────────────────────────────────────────┤
│ id (uuid)                               │
│ shop_id (fk → shops)                    │
│ sav_case_id (fk → sav_cases, nullable)  │
│ customer_id (fk → customers)            │
│ technician_id (fk → profiles, nullable) │
│ start_datetime (timestamptz)            │
│ duration_minutes (integer)              │
│ status (enum: proposed, confirmed,      │
│         counter_proposed, cancelled,    │
│         completed, no_show)             │
│ appointment_type (enum: deposit,        │
│         pickup, diagnostic)             │
│ notes (text)                            │
│ device_info (jsonb)                     │
│ proposed_by (shop ou client)            │
│ confirmation_token (uuid, unique)       │
│ counter_proposal_datetime (timestamptz) │
│ counter_proposal_message (text)         │
│ created_at, updated_at                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│     shop_blocked_slots                  │
├─────────────────────────────────────────┤
│ id (uuid)                               │
│ shop_id (fk → shops)                    │
│ start_datetime (timestamptz)            │
│ end_datetime (timestamptz)              │
│ reason (text)                           │
│ technician_id (fk → profiles, nullable) │
└─────────────────────────────────────────┘
```

### 2. Nouveaux fichiers frontend

| Fichier | Description |
|---------|-------------|
| `src/pages/Agenda.tsx` | Page principale de l'agenda avec vue calendrier |
| `src/components/agenda/AgendaCalendar.tsx` | Composant calendrier interactif |
| `src/components/agenda/AppointmentDialog.tsx` | Dialog pour creer/modifier un RDV |
| `src/components/agenda/WorkingHoursConfig.tsx` | Configuration des horaires d'ouverture |
| `src/components/agenda/AppointmentProposal.tsx` | Composant pour proposer un RDV depuis un SAV |
| `src/components/agenda/SlotBlocker.tsx` | Bloquer des creneaux |
| `src/components/agenda/ClientAppointmentResponse.tsx` | Interface client pour repondre a un RDV |
| `src/hooks/useAppointments.ts` | Hook de gestion des RDV |
| `src/hooks/useWorkingHours.ts` | Hook pour les horaires |
| `src/pages/AppointmentConfirm.tsx` | Page publique de confirmation RDV |

### 3. Modifications de fichiers existants

| Fichier | Modification |
|---------|--------------|
| `src/App.tsx` | Ajouter routes `/agenda` et `/rdv/:token` |
| `src/components/layout/Sidebar.tsx` | Ajouter menu "Agenda" avec icone Calendar |
| `src/hooks/useMenuPermissions.ts` | Ajouter permission `agenda` |
| `src/pages/SAVDetail.tsx` | Bouton "Proposer un RDV" |
| `src/components/sav/MessagingInterface.tsx` | Bouton rapide pour proposer RDV |
| `src/pages/TrackSAV.tsx` | Afficher les RDV proposes au client |
| `src/hooks/useSMS.ts` | Nouvelle fonction `sendAppointmentSMS` |

---

## Fonctionnalites detaillees

### Cote magasin (technicien/admin)

1. **Vue calendrier** :
   - Vue jour / semaine / mois
   - Affichage des RDV par couleur selon statut
   - Glisser-deposer pour deplacer un RDV
   - Clic sur un creneau vide pour creer un RDV

2. **Configuration des horaires** :
   - Definir les heures d'ouverture par jour
   - Pauses dejeuner configurables
   - Jours feries / fermetures exceptionnelles

3. **Gestion des RDV** :
   - Creer un RDV manuel (avec ou sans SAV)
   - Proposer un RDV depuis un dossier SAV
   - Definir la duree estimee de reparation
   - Assigner un technicien
   - Voir les contre-propositions clients

4. **Blocage de creneaux** :
   - Bloquer des plages horaires (reunion, absence)
   - Option par technicien ou pour tout le magasin

### Cote client

1. **Reception de proposition** :
   - Notification dans le chat SAV
   - SMS optionnel avec lien de confirmation
   - Email optionnel (future)

2. **Reponse du client** :
   - Accepter le creneau propose
   - Proposer un autre creneau parmi les disponibilites
   - Ajouter un message

3. **Page de confirmation publique** :
   - URL unique avec token (`/rdv/{token}`)
   - Vue des creneaux disponibles
   - Confirmation en 1 clic

### Integration SAV

1. **Depuis la page SAVDetail** :
   - Bouton "Proposer un RDV"
   - Selection du creneau dans un calendrier popup
   - Choix du canal (chat seul, SMS, les deux)
   - Duree estimee de reparation

2. **Dans le chat** :
   - Message automatique avec le RDV propose
   - Bouton de confirmation inline
   - Affichage du statut (en attente, confirme, modifie)

---

## Flux de communication

```text
1. Technicien propose RDV depuis SAV
           │
           ▼
2. Message auto dans chat SAV
   + SMS optionnel avec lien
           │
           ▼
3. Client recoit la proposition
           │
           ├──→ Accepte → RDV confirme
           │              Notification au magasin
           │
           └──→ Contre-propose
                     │
                     ▼
              4. Magasin recoit notification
                 Nouveau creneau propose
                       │
                       ▼
              5. Magasin confirme ou reprend contact
```

---

## Details techniques

### Structure du message SMS

```text
Bonjour {nom},

Nous vous proposons un RDV le {date} a {heure} 
pour votre {type} (duree estimee: {duree}).

Confirmez ici : {lien_court}

{nom_magasin}
```

### Structure du message chat

```text
📅 Proposition de rendez-vous

Date : Lundi 3 fevrier 2026
Heure : 14h00 - 15h00
Type : Depot pour reparation
Duree estimee : 60 minutes

[Confirmer] [Proposer un autre creneau]
```

### Permissions

- `agenda` : Acces au menu Agenda
- Les plans gratuits pourraient avoir un nombre limite de RDV/mois
- Option dans `subscription_plans` pour activer/desactiver

---

## Phases d'implementation

### Phase 1 : Base (prioritaire)
1. Creation des tables SQL
2. Page Agenda avec calendrier basique
3. CRUD des rendez-vous
4. Integration dans la sidebar

### Phase 2 : Integration SAV
1. Bouton proposition RDV dans SAVDetail
2. Affichage dans le chat
3. Page publique de confirmation

### Phase 3 : Notifications
1. Envoi SMS pour propositions
2. Notifications en temps reel
3. Rappels automatiques (optionnel)

### Phase 4 : Ameliorations
1. Vue multi-techniciens
2. Statistiques des RDV
3. Export calendrier (iCal)

---

## Estimation

- **Phase 1** : Base structurelle
- **Phase 2** : Integration complete SAV + client
- **Phase 3** : Notifications et SMS
- **Phase 4** : Ameliorations futures

Le systeme sera concu pour etre extensible et permettre des evolutions futures comme la reservation en ligne depuis le site web de la boutique.
