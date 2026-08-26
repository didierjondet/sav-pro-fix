# Restaurer l'édition du SAV et les commentaires (+ enregistrement automatique)

## Constat vérifié

Dans `src/pages/SAVDetail.tsx` il existe deux rendus distincts :

- Vue **standard** (à partir de la ligne ~844) : contient bien le bouton crayon `EditSAVDetailsDialog` dans la carte « Détails du dossier », la carte « Commentaire technicien » (visible client) et la carte « Commentaires privés magasin ».
- Vue **simplifiée** (à partir de la ligne ~344, activée par `localStorage.fixway_simplified_view === 'true'`) : l'onglet Aperçu ne contient **ni** le bouton crayon d'édition, **ni** les deux zones de commentaires. C'est la cause du problème signalé.

Les fonctions d'enregistrement (`saveTechnicianComments`, `savePrivateComments`) et l'état existent déjà dans le composant, elles ne sont simplement pas utilisées dans la vue simplifiée.

## Ce qui sera fait

1. **Vue simplifiée — onglet Aperçu** : ajouter, dans la carte « Appareil & dossier », le même bouton crayon `EditSAVDetailsDialog` (marque, modèle, IMEI, SKU, panne, notes de réparation) que la vue standard.
2. **Vue simplifiée — onglet Aperçu** : réintégrer les deux cartes existantes, à l'identique de la vue standard :
   - « Commentaire technicien » (visible client, imprimé sur le bon de restitution) avec le reformulateur IA ;
   - « Commentaires privés magasin » (interne uniquement) avec le reformulateur IA.
3. **Enregistrement automatique** des deux zones de commentaires, dans les deux vues : sauvegarde déclenchée automatiquement ~1,2 s après la dernière frappe (et à la sortie du champ), sans clic obligatoire.
4. **Indicateur d'état visible** à côté du titre de chaque zone : « Modifications non enregistrées » → « Enregistrement… » → « Enregistré à HH:MM ». Le bouton « Sauvegarder » reste présent comme filet de sécurité.
5. Aucune modification du reste de la page (onglets, en-tête, autres composants), ni de la base de données.

## Détails techniques

- Fichier concerné : `src/pages/SAVDetail.tsx` (plus, si besoin, un petit hook local d'autosave défini dans ce fichier).
- Réutilisation des composants et handlers existants : `EditSAVDetailsDialog`, `AITextReformulator`, `saveTechnicianComments`, `savePrivateComments`, journalisation via `logSAVChange` conservée.
- Autosave : `useEffect` avec `setTimeout` (debounce 1,2 s) comparant la valeur courante à la dernière valeur enregistrée ; annulation du timer au démontage ; pas d'écriture si la valeur est inchangée.
- Le canal Realtime existant met déjà à jour `technician_comments` ; l'autosave ne réécrira pas une valeur reçue du serveur (comparaison à la référence de dernière valeur sauvegardée) pour éviter les boucles.
- Les toasts de succès seront supprimés/atténués pour l'autosave (l'indicateur textuel suffit) afin de ne pas spammer l'écran ; le bouton manuel garde son toast.
