# Impression SAV et reformulation de panne concise

## 1. Une seule partie imprimée lorsque le SAV n’a pas de client

L’impression de prise en charge génère actuellement systématiquement deux parties côte à côte : client et magasin.

- Si aucun compte client n’est rattaché au dossier, imprimer uniquement l’exemplaire **MAGASIN** et retirer la séparation de découpe.
- Si un compte client est rattaché, conserver les deux exemplaires côte à côte sur la même page.
- Se baser sur le rattachement réel du dossier (`customer_id`), pas uniquement sur le type de SAV ou la présence de coordonnées. Un client sans téléphone reste un client rattaché.
- Appliquer la règle à l’impression après création comme à la réimpression depuis le dossier, sans modifier les étiquettes ni la feuille de test manette.

## 2. Identifier immédiatement le destinataire

- Ajouter en tête de chaque partie un bandeau bien visible : **CLIENT — À REMETTRE AU CLIENT** et **MAGASIN — À CONSERVER**.
- Distinguer les bandeaux par deux couleurs contrastées et des pictogrammes client/magasin ; les grands libellés et les bordures doivent rester lisibles en noir et blanc.
- Conserver le format compact, les deux parties côte à côte lorsqu’il y a un client, les numéros de SAV et les codes-barres actuels.
- Garder le type de SAV et le prestataire visibles sur l’exemplaire magasin, séparément du bandeau de destination.

## 3. Raccourcir uniquement la reformulation « Description du problème »

Le bouton de reformulation utilise actuellement une consigne de clarté technique sans contrainte explicite de brièveté.

- Demander la formulation la plus courte possible : une phrase, ou deux phrases très courtes si nécessaire ; viser au maximum 30 mots pour une panne courante.
- Conserver les symptômes et précisions indispensables, sans répétitions, titre, introduction, diagnostic supposé ou conseils ajoutés.
- Ne pas rallonger une description déjà claire et courte ; ne pas couper mécaniquement le texte au risque de perdre une panne importante.
- Exemple : « Écran cassé après chute ; tactile inopérant. »
- Ne modifier ni le diagnostic IA détaillé, ni les notes de réparation, ni les messages client, ni les descriptions déjà enregistrées.

## Détails techniques

- Impression : ajustement ciblé du document généré dans `src/components/sav/SAVPrint.tsx`, avec une règle de sélection des exemplaires testable.
- IA : modification uniquement du contexte `problem_description` dans `supabase/functions/ai-reformulate-text/index.ts`, puis déploiement de cette fonction.
- Aucun changement de base de données ni des autres écrans.

## Vérifications

- Tests de la règle d’impression : sans client = magasin seul ; avec client = client + magasin ; client sans coordonnées = deux exemplaires.
- Vérification des impressions après création et depuis un dossier existant : bandeaux nettement distincts, codes-barres conservés, pas de débordement avec des données représentatives.
- Essais de reformulation sur une panne simple, un texte répétitif et plusieurs symptômes : résultat court, fidèle, sans informations inventées.
- Vérification des tests concernés et des erreurs de compilation ; signaler explicitement si l’accès connecté empêche une vérification complète.