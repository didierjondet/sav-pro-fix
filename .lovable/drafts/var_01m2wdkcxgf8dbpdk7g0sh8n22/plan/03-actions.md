## Ce que je propose de faire

### 1. Arrêter les rafraîchissements en boucle (gain principal)
Remplacer les minuteries permanentes par une logique simple : on recharge à l'ouverture d'un écran, au retour sur l'onglet, et lorsqu'une donnée change réellement.

- Messages d'un dossier : passage d'un rechargement complet toutes les 30 s à une écoute temps réel ciblée sur la conversation ouverte.
- Compteurs de messages non lus : un seul compteur global, rafraîchi à l'ouverture et sur événement, au lieu de deux minuteries superposées (10 s + 60 s).
- Pastilles d'un dossier (non lus, prêt en cours) : suppression des minuteries de 15 s et 30 s.
- Liste SAV, notifications, prestataires : rechargement à l'ouverture et sur action, plus de sondage permanent.
- Arrêt de tout rafraîchissement lorsque l'onglet n'est pas visible.

### 2. Ne plus afficher « aucune donnée » en cas de lenteur
Les chargements qui échouent renvoient aujourd'hui une liste vide. Ils conserveront l'affichage précédent et signaleront simplement « connexion lente, nouvelle tentative », avec relance automatique. C'est ce qui règle la perte de données au retour d'un dossier.

### 3. Accélérer le tableau de bord
- Ne demander que les colonnes réellement affichées (aujourd'hui on récupère tout le contenu des dossiers, y compris les champs volumineux).
- Charger d'abord les chiffres clés, puis les graphiques détaillés.
- Mémoriser les calculs statistiques pour éviter qu'ils soient refaits à chaque rendu.

### 4. Page Pièces
Charger les tarifs publics et le catalogue en même temps que la liste, et non après, pour que les prix s'affichent du premier coup.

### 5. Nettoyage du code obsolète
- Suppression du fournisseur « temps réel » vide qui ne fait plus rien.
- Suppression des messages de débogage affichés en production (dont un qui imprime la liste complète des conversations à chaque cycle).
- Suppression des fichiers, hooks et imports devenus inutilisés, repérés par l'audit.

### 6. Vérification
Mesure avant/après du nombre d'appels serveur et du temps d'affichage du tableau de bord, puis contrôle des parcours : ouverture d'un dossier, retour au tableau de bord, page Pièces, messagerie.

## Notes techniques

- Le vrai goulot est le volume d'appels PostgREST, pas les index : les tables sont petites et déjà indexées (`sav_messages(sav_case_id, created_at)`, `notifications(shop_id, read, created_at)`).
- Fichiers principalement concernés : `src/hooks/useSAVMessages.ts`, `useSAVUnreadMessages.ts`, `useSAVCaseIndicators.ts`, `useSAVCases.ts`, `useNotifications.ts`, `useSAVProviders.ts`, `useStatistics.ts`, `useParts.ts`, `src/pages/Index.tsx`, `src/pages/Parts.tsx`, `src/contexts/RealtimeContext.tsx`, `src/App.tsx`.
- Aucun changement de schéma de base de données, aucune modification fonctionnelle ni visuelle : uniquement rythme de chargement, gestion d'erreur et suppression de code mort.
