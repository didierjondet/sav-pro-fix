

## Plan : Corriger le layout de la page Agenda + Enrichir les connaissances du bot

### Problème 1 : Layout Agenda différent des autres pages

**Cause** : La page Agenda utilise une structure différente des autres pages :

```text
Agenda (actuel — INCORRECT) :
┌──────────────────────────────┐
│         HEADER (pleine largeur) │
├────────┬─────────────────────┤
│ Sidebar│    Main content     │
└────────┴─────────────────────┘

Autres pages (correct) :
┌────────┬─────────────────────┐
│        │      HEADER         │
│ Sidebar├─────────────────────┤
│        │    Main content     │
└────────┴─────────────────────┘
```

La structure d'Agenda est `flex-col > Header > flex > Sidebar + main`. Les autres pages utilisent `flex h-screen > Sidebar > flex-col > Header + main`.

**Correction** (`src/pages/Agenda.tsx`) : Aligner la structure sur le modèle des autres pages :
```
<div className="min-h-screen bg-background">
  <div className="flex h-screen">
    <Sidebar ... />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header ... />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        ...
      </main>
    </div>
  </div>
</div>
```

---

### Problème 2 : Enrichir les connaissances du bot

Le bot accède déjà aux données en temps réel du magasin (stock, SAV, clients, devis, commandes). Mais le system prompt manque de profondeur sur les fonctionnalités et règles métier de Fixway.

**Correction** (`supabase/functions/help-bot/index.ts`) :

1. **Enrichir le SYSTEM_PROMPT** avec une documentation complète des fonctionnalités :
   - Cycle de vie complet d'un dossier SAV (création → diagnostic → devis → réparation → clôture)
   - Gestion des pièces détachées (stock, réservation, commande, seuils min)
   - Système de devis (création, envoi client, acceptation/refus, lien avec SAV)
   - Messagerie interne (communication boutique ↔ client via tracking)
   - QR codes et suivi client public
   - Codes de sécurité (pattern lock, code PIN)
   - Système de SMS (crédits, envoi, notifications)
   - Agenda et rendez-vous (planification, contre-propositions)
   - Statistiques et widgets personnalisables
   - Import/export de données (clients, SAV, pièces)
   - Système d'abonnement et limites par plan
   - Rôles utilisateurs (admin, technicien)

2. **Rendre les réponses plus concises** : Ajouter dans les règles du prompt l'instruction d'être bref et de poser des questions de clarification plutôt que de donner de longues réponses génériques.

3. **Augmenter l'interactivité** : Instruire le bot à dialoguer, poser des questions de suivi pour mieux cerner le besoin avant de répondre.

---

### Fichiers impactés

- **`src/pages/Agenda.tsx`** — Restructurer le layout pour correspondre aux autres pages (Sidebar en premier, Header à droite)
- **`supabase/functions/help-bot/index.ts`** — Enrichir le SYSTEM_PROMPT avec la documentation métier complète, instructions de concision et de dialogue interactif

