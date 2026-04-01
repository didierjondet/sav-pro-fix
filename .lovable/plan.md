

## Plan : Ajouter le commentaire client au PDF et option d'impression des documents/photos

### Probleme 1 : Commentaire client absent du document de restitution

Le PDF (`pdfGenerator.ts`) affiche uniquement `technician_comments` (ligne 755) et `repair_notes` (ligne 636). Le champ "Commentaire pour le client" dans la popup de cloture correspond a `technician_comments`, qui est bien imprime. Cependant, le commentaire du **client** (messages envoyes par le client via la messagerie) n'est pas du tout recupere ni affiche dans le PDF.

**Correction :** Dans `generateSAVRestitutionPDF`, recuperer les messages SAV du client (`sav_messages` avec `sender_type = 'client'`) et les afficher dans une section dediee du document, par exemple "Messages du client".

### Probleme 2 : Option d'impression des documents et photos lies au SAV

Actuellement la popup de cloture ne propose pas d'option pour inclure les pieces jointes (photos, documents) du SAV dans l'impression.

**Correction :** Ajouter un switch "Imprimer les documents et photos" dans la popup de cloture (`SAVCloseUnifiedDialog.tsx`). Si active, les images des pieces jointes (`savCase.attachments`) seront incluses dans le PDF de restitution.

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/utils/pdfGenerator.ts` | Ajouter parametre `options` avec `includeAttachments` et `clientMessages`. Afficher les messages client dans une section. Afficher les photos/documents si option activee |
| `src/components/sav/SAVCloseUnifiedDialog.tsx` | Ajouter state `printAttachments` avec un switch. Recuperer les messages client depuis `sav_messages`. Passer ces options a `generateSAVRestitutionPDF` |

### Detail technique

1. **SAVCloseUnifiedDialog.tsx** :
   - Ajouter `const [printAttachments, setPrintAttachments] = useState(false)`
   - Recuperer les messages client : `supabase.from('sav_messages').select('*').eq('sav_case_id', savCase.id).eq('sender_type', 'client').order('created_at')`
   - Ajouter une Card avec un switch "Imprimer les documents et photos joints"
   - Passer `{ includeAttachments: printAttachments, clientMessages }` a `generateSAVRestitutionPDF`

2. **pdfGenerator.ts** :
   - Modifier la signature pour accepter un 3e parametre `options?: { includeAttachments?: boolean, clientMessages?: any[] }`
   - Apres la section "Commentaires technicien", ajouter une section "Messages du client" si des messages existent
   - Apres les signatures, ajouter les images des pieces jointes si `includeAttachments` est true (images inline dans le HTML)

