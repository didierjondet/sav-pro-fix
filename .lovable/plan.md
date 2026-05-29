## Objectif
Permettre d'imprimer le rapport généré par l'Assistant Quotidien IA depuis la page Statistiques.

## Changements
**Fichier unique : `src/components/statistics/DailyAssistant.tsx`**

1. Ajouter un bouton "Imprimer" (icône `Printer` de lucide-react) à côté du bouton "Analyser", visible uniquement quand `recommendations` est présent et `loading` est false.
2. Ajouter une fonction `handlePrint()` qui :
   - Ouvre une fenêtre `window.open()` synchroniquement (pour éviter le blocage de popup navigateur).
   - Écrit un HTML autonome contenant :
     - Titre "Rapport Quotidien IA" + date du jour formatée en français.
     - Nom de la boutique (récupéré via `useShop` si nécessaire).
     - Les badges de stats (SAV en retard, prêts, CA potentiel) si présents.
     - Le contenu des recommandations formaté (titres, puces, paragraphes) — réutilise la même logique de parsing que `formatRecommendations` mais en HTML pur.
   - CSS d'impression simple (A4, Arial, marges 20px, couleurs sobres, `@media print`).
   - Appelle `printWindow.print()` après `document.close()`.
3. Si `window.open` retourne null (popup bloquée) → toast d'erreur.

## Hors scope
- Pas de modification du contenu, du style de la carte, du dialog de config, ni de l'edge function `daily-assistant`.
- Pas de génération PDF côté serveur (impression navigateur suffit).
- Pas de sauvegarde/historique des rapports.

## Validation
- Cliquer "Analyser" → rapport affiché → bouton "Imprimer" visible.
- Clic "Imprimer" → nouvelle fenêtre s'ouvre avec rapport mis en page + dialog d'impression natif.
- Si popup bloquée → toast explicite.
