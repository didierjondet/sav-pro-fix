## Objectif
Réorganiser la page SAV (vues standard + simplifiée) avec 4 nouveaux onglets et améliorer la visibilité contextuelle du bandeau supérieur et de la messagerie.

## Modifications par onglet

### 1. Nouvel onglet "Codes"
- Créer `TabsTrigger value="codes"` avec icône cadenas.
- Déplacer de l'onglet Aperçu la carte contenant : code de déverrouillage, PatternLock, `SecurityCodesDisplay` (iCloud, mail, PIN SIM).
- Supprimer cette zone de l'Aperçu (l'Aperçu reste : description problème, historique produit, client, appareil, commentaires technicien/privés).

### 2. Onglet "Pièces" enrichi
- Actuellement l'onglet affiche seulement `SAVPartsRequirements` (résumé/coûts).
- Ajouter au-dessus le composant complet `SAVPartsEditor` (déjà utilisé ailleurs) permettant : ajout, modification quantité/prix, suppression de pièces.
- Conserver `SAVPartsRequirements` en dessous comme récapitulatif coûts/marge.
- Dans l'Aperçu : retirer l'éditeur de pièces s'il y est, laisser uniquement un rappel léger (total).

### 3. Nouvel onglet "Diagnostic" (IA)
- Créer `TabsTrigger value="diagnostic"` avec icône `Stethoscope` ou `AlertCircle`.
- Structure de l'onglet :
  1. **Panne détectée** : bloc affichant `problem_description` du SAV (lecture seule, mise en évidence).
  2. **Causes possibles & pistes de réparation** : au premier affichage, appel automatique à une edge function `ai-diagnostic-sav` qui envoie `{ problem_description, device_brand, device_model, sav_type }` au modèle `google/gemini-3-flash-preview` via `LOVABLE_API_KEY`. Réponse structurée : liste de causes probables + solutions/étapes de vérification, rendue en markdown (`react-markdown`).
     - Résultat mis en cache dans une nouvelle colonne texte `sav_cases.ai_diagnostic` (via migration) pour éviter de reconsommer des crédits à chaque ouverture. Bouton "Régénérer" disponible.
  3. **Chat technicien ↔ IA** : zone conversationnelle locale (persistée dans une nouvelle table `sav_diagnostic_messages` avec `sav_case_id, role, content, created_at, user_id`) où le technicien peut poser des questions de suivi. L'edge function reçoit l'historique + contexte SAV et répond.
- Composants nouveaux : `src/components/sav/SAVDiagnosticTab.tsx`, edge function `supabase/functions/ai-diagnostic-sav/index.ts`.

### 4. Nouvel onglet conditionnel "Prêt matériel"
- Affiché **uniquement** si un prêt existe (détecté via `useLoanerLoans` filtré par `sav_case_id` — retourner un booléen `hasLoan`).
- Onglet stylé en rouge : `TabsTrigger` avec `className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground text-destructive"`.
- Contenu = `SAVLoanerCard` complet (déjà supporte ajouter/modifier/supprimer/restituer).
- Retirer `SAVLoanerCard` de l'Aperçu.

### 5. Pastille onglet "Communication"
- Utiliser `useSAVUnreadMessages` (existant) pour compter les messages non lus **et** les messages reçus depuis l'ouverture du SAV tant que le SAV n'est pas dans un statut final.
- Afficher un `Badge` rouge à côté du label "Communication" avec le compteur.
- La pastille reste visible tant que `savCase.status` n'est pas un statut final (via `isReadyStatus` / `is_final_status`).

### 6. Bandeau supérieur plus visible
- Actuellement `bg-background/95 backdrop-blur border-b` → peu contrasté.
- Remplacer par un fond plus prononcé : `bg-slate-700 text-slate-50` (ou `bg-primary/90 text-primary-foreground`) avec `border-b border-slate-800`.
- Adapter les couleurs du bouton Retour, du numéro de dossier, badges (garder leurs couleurs propres) et texte client pour rester lisibles sur fond foncé.
- Appliquer à la fois à la vue simplifiée et à la vue standard.

## Application aux deux vues
Toutes les modifications ci-dessus s'appliquent identiquement à la vue standard et à la vue simplifiée dans `src/pages/SAVDetail.tsx` (structure d'onglets déjà unifiée).

## Détails techniques

**Migrations Supabase** :
```sql
-- Cache diagnostic IA
ALTER TABLE public.sav_cases ADD COLUMN ai_diagnostic TEXT;
ALTER TABLE public.sav_cases ADD COLUMN ai_diagnostic_generated_at TIMESTAMPTZ;

-- Chat diagnostic
CREATE TABLE public.sav_diagnostic_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sav_case_id UUID NOT NULL REFERENCES sav_cases(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- + GRANTs authenticated/service_role, RLS scope shop_id via has_role/profile.shop_id
```

**Edge function** `ai-diagnostic-sav` :
- Mode 1 (diagnostic initial) : renvoie markdown structuré "## Causes possibles\n...\n## Solutions\n...".
- Mode 2 (chat) : reçoit `{ messages, savContext }`, appelle Lovable AI Gateway, renvoie réponse.
- Gestion 429/402 comme les autres fonctions IA existantes.

**Fichiers modifiés/créés** :
- `src/pages/SAVDetail.tsx` : ajout des 4 TabsTrigger, réorganisation TabsContent, bandeau recoloré, pastille Communication.
- `src/components/sav/SAVDiagnosticTab.tsx` (nouveau).
- `src/components/sav/SAVCodesTab.tsx` (nouveau, regroupe unlock/pattern/security codes).
- `supabase/functions/ai-diagnostic-sav/index.ts` (nouveau).
- Migration SQL.

## Hors périmètre
- Pas de changement de logique métier sur pièces, prêts, statuts.
- Pas de refonte visuelle globale ; uniquement le bandeau SAV.
