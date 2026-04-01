

## Plan : Synchroniser les commentaires sauvegardés dans la popup de clôture et le PDF

### Diagnostic

Le problème est un **état stale** (périmé) :

1. L'utilisateur sauvegarde des commentaires dans SAVDetail (écriture en base OK)
2. Il ouvre la popup de clôture → celle-ci initialise ses champs depuis `savCase` (l'objet React en mémoire)
3. Mais `savCase` n'a pas été rafraîchi après la sauvegarde → les champs sont vides
4. Le PDF est aussi généré avec ce même objet stale → commentaires absents du document

**Ligne 74** de `SAVCloseUnifiedDialog.tsx` :
```typescript
const [technicianComments, setTechnicianComments] = useState(savCase.technician_comments || '');
```
`useState` ne se met à jour qu'au premier rendu. Quand le dialog se rouvre, l'état initial reste l'ancienne valeur.

### Correction

**Fichier : `src/components/sav/SAVCloseUnifiedDialog.tsx`**

1. Ajouter un `useEffect` qui recharge les commentaires depuis la base quand le dialog s'ouvre (`isOpen` passe à `true`) :
   - Requête `supabase.from('sav_cases').select('technician_comments, private_comments, repair_notes').eq('id', savCase.id).single()`
   - Mettre à jour `technicianComments` et `privateComments` avec les valeurs fraîches

2. Dans `handleConfirm`, quand on construit `caseForPDF`, injecter les commentaires actuels du dialog :
   ```typescript
   const caseForPDF = {
     ...freshCase || savCase,
     technician_comments: technicianComments,
     private_comments: privateComments,
   };
   ```

3. Même correction pour `handleGenerateDocument` (le bouton manuel, s'il reste).

### Fichier modifié
- `src/components/sav/SAVCloseUnifiedDialog.tsx`

### Résultat attendu
- Les commentaires sauvegardés dans le SAV apparaissent pré-remplis dans la popup de clôture
- Le PDF de restitution contient bien les commentaires technicien
- Cohérence totale entre la saisie, la popup et le document

