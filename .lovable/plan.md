## Objectif
Renforcer Fixy pour qu’il devienne un assistant opérationnel complet : dictée vocale, pièces jointes PDF/images, accès fiable à toutes les données métier utiles, agenda, et génération de rapports PDF imprimables — tout en excluant les coordonnées clients dans ses réponses et rapports.

## 1. Corriger l’accès aux données SAV (prioritaire)
Le problème retourné par Fixy vient probablement de l’outil `get_sav_case_detail` : il cherche le numéro avec `ilike %...%` et récupère trop de données imbriquées d’un coup, ce qui peut échouer ou retourner le mauvais dossier.

Je vais :
- fiabiliser la recherche par numéro de dossier exact, puis fallback normalisé si l’utilisateur écrit `#2026-05-22-001` ;
- séparer la récupération en plusieurs requêtes robustes : dossier, pièces, messages, RDV liés, devis liés, historique de clôture/audit si disponible ;
- supprimer des retours IA les coordonnées clients : téléphone, email, adresse ;
- conserver les infos métier utiles : nom/prénom client si nécessaire, appareil, IMEI/SKU, panne, notes techniques, pièces, coûts, statuts, messages, RDV ;
- ajouter un message d’erreur technique plus exploitable côté logs, sans exposer de données sensibles à l’utilisateur.

## 2. Donner à Fixy un vrai accès Agenda
Dans `supabase/functions/help-bot/index.ts`, l’outil agenda actuel utilise des champs qui ne correspondent pas à la table (`start_at/end_at` au lieu de `start_datetime/duration_minutes`). Je vais le corriger et l’étendre :
- `list_appointments` : RDV par période, statut, type, technicien, client, SAV lié ;
- `get_appointment_detail` : détail complet d’un RDV, contre-proposition, notes, SAV lié, technicien ;
- contexte compact : RDV du jour, RDV demain, demandes/contre-propositions en attente.

## 3. Ajouter la dictée vocale à Fixy
Dans `src/components/help/HelpBot.tsx` :
- bouton micro compact à côté de l’envoi ;
- transcription via l’API native navigateur `SpeechRecognition/webkitSpeechRecognition` en français ;
- affichage état écoute en cours ;
- la transcription reste éditable avant envoi pour éviter les erreurs ;
- fallback discret si le navigateur ne supporte pas la dictée.

## 4. Ajouter les pièces jointes PDF/images dans le chat Fixy
Côté UI/hook :
- bouton trombone dans Fixy ;
- acceptation uniquement `image/*` et `application/pdf` ;
- upload dans un chemin isolé par boutique, conversation et utilisateur ;
- affichage des fichiers joints avant envoi ;
- envoi à l’edge function sous forme de métadonnées et URLs signées temporaires.

Côté Supabase :
- utiliser un bucket privé dédié si nécessaire, ou réutiliser un bucket privé existant avec règles propres ;
- RLS stricte par `shop_id` ;
- aucune exposition publique permanente des fichiers.

Côté Fixy :
- recevoir les pièces jointes dans `help-bot` ;
- pour les PDF/images, fournir au modèle le contexte fichier (nom/type/lien signé) ;
- demander à l’IA de tenir compte des documents joints pour diagnostic, devis, rapport ou résumé.

## 5. Permettre à Fixy de générer des rapports PDF imprimables
Ajouter dans `help-bot` un mode rapport :
- quand l’utilisateur demande un rapport imprimable (ex : non-réparabilité, diagnostic, synthèse SAV, rapport client/interne), Fixy appelle les outils de données nécessaires ;
- génération d’un HTML imprimable A4 côté edge function ;
- création d’un PDF/HTML imprimable accessible par lien sécurisé.

Approche prudente :
- si la génération PDF binaire n’est pas fiable dans l’edge function, générer un document HTML A4 imprimable ouvrable dans le navigateur, avec bouton impression natif ;
- stocker le rapport dans un bucket privé ou retourner directement le contenu imprimable ;
- masquer systématiquement email/téléphone/adresse client ;
- inclure uniquement les informations métier : dossier, appareil, panne, diagnostic, tests, pièces, conclusion, date, boutique.

## 6. Exemples avancés au début du chat
Remplacer/compléter le démarrage simple par des exemples cliquables plus puissants :
- `Génère un rapport de non-réparabilité imprimable pour le SAV #2026-05-22-001.`
- `Lis ce PDF/photo et résume-moi les points importants pour le diagnostic.`
- `Quels RDV ai-je demain, avec les SAV associés et les techniciens assignés ?`
- `Quel est le taux de retour de cet IMEI pour la même panne et les autres pannes ?`
- `Diagnostic : iPhone 13 écran noir après chute, quelles vérifications et quelles pièces en stock ?`
- `Liste les SAV en retard, la raison probable et l’action à faire aujourd’hui.`

## 7. Sécurité et périmètre
- Accès boutique strictement filtré par `shop_id`.
- Pas de coordonnées clients dans les réponses et rapports : téléphone, email, adresse exclus.
- Service role uniquement dans l’edge function, jamais côté navigateur.
- Pas de modification des pages Agenda/SAV existantes sauf intégration nécessaire avec Fixy.

## Fichiers prévus
- `src/components/help/HelpBot.tsx`
- `src/hooks/useHelpBot.ts`
- `supabase/functions/help-bot/index.ts`
- migration Supabase uniquement si un bucket ou une table de rapports/pièces jointes manque.

## Validation
- Tester une demande sur `#2026-05-22-001` pour confirmer que Fixy récupère bien le dossier.
- Tester `list_appointments` avec les champs réels de l’agenda.
- Vérifier upload PDF/image et transmission à Fixy.
- Vérifier qu’un rapport demandé retourne un lien/document imprimable sans coordonnées client.