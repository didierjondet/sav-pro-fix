## Objectif
Rendre Fixy fiable pour les opérations simples et avancées : accès stock/SAV complet, listes exactes des pièces réservées/fantômes, rapports PDF propres, et aide diagnostic technique avec recherche internet.

## 1. Corriger le vrai bug des réservations fantômes
- Remplacer la logique de recalcul actuelle, car elle peut laisser des pièces à `reserved_quantity > 0` quand elles ne sont liées qu’à des SAV clôturés.
- Recalculer toutes les pièces de la boutique avec une règle simple :
  - `reserved_quantity = somme des quantités dans sav_parts uniquement pour les SAV non finaux`
  - `0` si aucun SAV ouvert ne justifie la réservation.
- Corriger le trigger `handle_sav_part_stock_reservation` pour qu’une pièce ajoutée/modifiée sur un SAV déjà final ne crée pas de nouvelle réservation fantôme.
- Garder la libération/restauration automatique lors du passage d’un SAV en statut final ou réouvert, mais avec une fonction commune pour reconnaître les statuts finaux.
- Relancer une remise à plat des réservations existantes après migration.

## 2. Ajouter des RPC d’audit fiables pour Fixy
Créer des fonctions SQL dédiées, plutôt que laisser Fixy bricoler plusieurs requêtes approximatives :
- `audit_part_reservations(p_shop_id)` : liste toutes les pièces réservées avec : stock physique, réservé actuel, réservé attendu, unités fantômes, SAV ouverts qui justifient la réservation.
- `list_savs_for_ghost_reserved_parts(p_shop_id)` : liste les SAV historiques liés aux pièces qui ont encore une réservation fantôme, pour répondre précisément aux questions du type “combien de SAV sont concernés”.
- Ces fonctions seront limitées à la boutique courante, sans coordonnées client sensibles.

## 3. Réparer et renforcer les outils Fixy
Dans `supabase/functions/help-bot/index.ts` :
- Remplacer les outils stock fragiles par les nouvelles RPC d’audit.
- Faire en sorte que les demandes contenant “réservé”, “fantôme”, “stock”, “pièce bloquée”, “SAV concerné” déclenchent systématiquement les bons outils.
- Augmenter la capacité de raisonnement multi-outils pour éviter qu’il s’arrête trop tôt sur un seul résultat.
- Ajouter un outil de rapport générique pour transformer n’importe quel résultat d’audit en rapport structuré.
- Garder les réponses concises, mais imposer un format clair quand il liste des résultats : résumé, tableau, anomalies, action proposée.

## 4. Rapports PDF depuis Fixy
- Étendre `generate_printable_report` pour accepter des rapports d’audit stock/SAV, pas seulement diagnostic ou synthèse SAV.
- Côté chat Fixy, ajouter un bouton de rapport plus clair : “Ouvrir / enregistrer en PDF”.
- Préserver le HTML A4 imprimable et permettre à Fixy de générer un rapport quand l’utilisateur demande “rapport”, “PDF”, “imprimer”, “export”.
- Sauvegarder les rapports dans les messages de conversation pour ne pas les perdre pendant la session.

## 5. Mode “super technicien” avec internet
- Ajouter à Fixy une compétence diagnostic guidé : il pose des questions utiles quand les symptômes sont incomplets, puis propose tests, causes probables, pièces candidates et risques.
- Ajouter un outil de recherche internet technique via la clé `FIRECRAWL_API_KEY` déjà configurée, pour croiser ses réponses avec des sources web quand l’utilisateur demande une aide réparation ou une panne inconnue.
- Garder la priorité aux données boutique : s’il parle d’une pièce, d’un modèle ou d’un SAV existant, Fixy consulte d’abord la base Fixway, puis complète avec internet si nécessaire.

## 6. Validation
- Tester en base que les pièces fantômes repassent bien à zéro quand aucun SAV ouvert ne les justifie.
- Tester Fixy avec ces demandes :
  - “liste les pièces réservées”
  - “liste les pièces fantômes”
  - “combien de SAV sont liés à des pièces fantômes”
  - “fais-moi un rapport PDF de ces résultats”
  - “aide-moi à diagnostiquer une panne de charge sur Xiaomi 13”
- Vérifier les logs de l’edge function `help-bot` après test.