## Problème
Dans la page Devis → onglet "Devis acceptés", le bouton "Créer le SAV" (dans le dialog de conversion) ne possède aucune protection contre les clics multiples. Cliquer 12 fois crée 12 dossiers SAV identiques. Le bouton "Convertir en SAV" de la liste ouvre simplement le dialog, mais c'est le bouton final qui crée réellement les doublons.

## Correction
Ajout d'un verrou côté client dans `src/pages/Quotes.tsx`.

### Changements
1. Ajouter un state `const [isConverting, setIsConverting] = useState(false)`.
2. Dans `convertQuoteToSAV(type)` :
   - Early-return si `isConverting` est déjà `true`.
   - `setIsConverting(true)` immédiatement au début.
   - Bloc `try/catch/finally` : dans `finally`, `setIsConverting(false)` et fermer le dialog (`setQuoteToConvert(null)`, `setSelectedSAVType('')`).
3. Bouton "Créer le SAV" (ligne ~1134) :
   - `disabled={!selectedSAVType || isConverting}`.
   - Libellé dynamique : `isConverting ? 'Création en cours...' : 'Créer le SAV'`.
4. Bouton "Annuler" : `disabled={isConverting}` pour empêcher la fermeture en pleine création.
5. `onOpenChange` du Dialog : ignorer la fermeture si `isConverting` est `true`.

### Hors scope
- Pas de changement UI/visuel autre que l'état désactivé du bouton.
- Pas de modification serveur ni de contrainte SQL (le verrou client suffit pour le cas signalé).
- Aucune autre logique métier touchée.