# Plan — Assistant plus performant + mascotte animée

## 1. Recherche pièce améliorée (prix d'achat moyen)

Problème actuel : quand on demande "prix d'achat moyen d'un écran iPhone 13", la fonction `performDataLookup` (help-bot) ne filtre que sur le mot-clé `écran` sans tenir compte du modèle, et ne calcule aucune moyenne.

### Modifications dans `supabase/functions/help-bot/index.ts`

**a) Extraction enrichie des entités dans la question**
- Détecter le **type de pièce** (écran, vitre, batterie, connecteur, nappe, caméra, haut-parleur, châssis, etc.)
- Détecter la **marque/modèle** via regex étendue : `iphone 13 pro max`, `iphone 13`, `samsung s23`, `galaxy a54`, `redmi note 12`, `pixel 8`, etc.
- Détecter l'**intention** : moyenne / minimum / maximum / dernier prix (`moyen`, `moyenne`, `prix d'achat`, `coût moyen`, `combien coûte`, `dernier prix`)

**b) Nouveau bloc factuel "Prix d'achat / vente"**

Quand pièce + modèle sont détectés :
1. Requête `parts` filtrée par `name ILIKE %type%` **ET** `name ILIKE %modele%` (chaque mot du modèle en AND), incluant `quantity, purchase_price, selling_price, supplier`.
2. Requête complémentaire sur `sav_parts` joint à `parts` (historique réel des prix payés sur les SAV récents — souvent plus représentatif que `parts.purchase_price` actuel).
3. Calculs serveur :
   - Prix d'achat **moyen** (pondéré par quantité achetée si dispo, sinon simple)
   - Prix d'achat **min / max**
   - Prix de vente **moyen / min / max**
   - **Marge moyenne** (€ et %)
   - Nombre de références trouvées et nombre d'unités vendues sur 90 j
4. Injecter un bloc Markdown garanti dans le prompt :

```
### 💰 Réponse factuelle – Écran iPhone 13 (5 réfs trouvées)
- Prix d'achat moyen : 42.30 €
- Min / Max : 35.00 € / 58.00 €
- Prix de vente moyen : 119.00 €
- Marge moyenne : 76.70 € (64 %)
- Historique 90 j : 12 unités utilisées en SAV
- Détail par référence : …
```

**c) Fallback intelligent**

Si aucune pièce ne matche le modèle exact :
- Élargir avec uniquement le type de pièce + recherche fuzzy (mots-clés du modèle séparés)
- Indiquer explicitement dans le bloc : *"Aucune référence exacte pour iPhone 13, voici les écrans iPhone toutes générations"*

**d) Renforcer le rappel système**

Dans `handleGemini` / handlers OpenAI, ajouter au "rappel système" déjà présent : *"Si un bloc « Réponse factuelle » est présent ci-dessus, utilise EXCLUSIVEMENT ces chiffres, ne réponds jamais « je ne sais pas » quand le bloc existe."*

### Reproduire dans `ai-data-assistant/index.ts`

Même logique d'extraction + bloc factuel, pour cohérence quel que soit l'assistant utilisé.

---

## 2. Mascotte animée à la place de l'icône `?`

Remplacer le `MessageCircleQuestion` du bouton flottant et du header du chat (`src/components/help/HelpBot.tsx`) par une **petite mascotte SVG animée** : un robot rond et mignon ("Fixy") avec antenne, yeux qui clignent et bras qui fait coucou.

### Création `src/components/help/FixyMascot.tsx`
- Composant SVG inline 100% CSS/Tailwind (pas de dépendance, pas d'asset image — instantané, scalable)
- Forme : tête ronde bleue (couleur `primary`), antenne avec point lumineux, 2 yeux, bouche souriante, 2 petits bras
- Props : `size`, `waving?: boolean`, `idle?: boolean`
- Animations (keyframes ajoutés dans `tailwind.config.ts`) :
  - `mascot-bounce` : léger rebond permanent (idle) toutes les 3 s
  - `mascot-wave` : bras droit qui fait coucou (rotation -20° ↔ +20°) déclenché toutes les 8–10 s sur le bouton fermé
  - `mascot-blink` : clignement des yeux (scaleY 1 → 0.1) toutes les 4–6 s
  - `mascot-antenna-pulse` : point d'antenne qui pulse quand `isLoading`
- Au survol du bouton fermé : la mascotte penche la tête + sourit plus grand

### Intégration dans `HelpBot.tsx`
- Bouton flottant fermé : remplacer `<MessageCircleQuestion>` par `<FixyMascot size={40} waving idle />` + petite bulle "Coucou !" qui apparaît brièvement toutes les 15 s pour engager
- Header du chat ouvert : remplacer la 2ᵉ icône par `<FixyMascot size={28} idle />` (penche la tête quand l'IA réfléchit)
- État vide (avant le 1er message) : afficher la mascotte en grand au centre avec bulle *"Salut ! Je suis Fixy, ton assistant Fixway 👋"*

### Aucun changement
- Pas de modif du backend pour la mascotte
- Pas de dépendance ajoutée (SVG + CSS uniquement)
- Comportement, FAQ, escalade, persistance : inchangés

---

## Périmètre exclu
- Pas de nouvelle table, pas de migration
- Pas de modif des autres edge functions (`daily-assistant` reste tel quel)
- Pas de refonte du design global du chat — uniquement l'icône → mascotte

## Validation
- "Prix d'achat moyen d'un écran iPhone 13 ?" → réponse avec moyenne chiffrée
- "Combien coûte une batterie Samsung S22 ?" → moyenne + min/max
- Bouton flottant : mascotte rebondit doucement, fait coucou périodiquement
- Chat ouvert : mascotte cligne des yeux dans le header
