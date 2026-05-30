## Modification de l'accueil Fixy

### Objectif
Simplifier l'écran de démarrage de Fixy : supprimer toutes les questions préformatées (exemples avancés + FAQ) et ne garder que le message d'introduction, avec le nom **"Fixy"** mis en valeur visuellement.

### Modifications

**Fichier : `src/components/help/HelpBot.tsx`**

1. **Supprimer la constante `ADVANCED_EXAMPLES`** (lignes 17-24) — remplacer par un tableau vide `[]`.
2. **Supprimer le bloc d'affichage des exemples avancés** (lignes 255-265) dans le rendu conditionnel `messages.length === 0`.
3. **Supprimer le bloc FAQ** (lignes 267-279) dans le même rendu conditionnel.
4. **Améliorer le texte d'introduction** (ligne 252-253) :
   - Ajouter un emoji ⚡ ou 🤖 avant le nom
   - Mettre **"Fixy"** en gras avec la classe `text-primary` (couleur primaire du thème)
   - Mentionner la mémoire de Fixy dans le texte
   - Exemple de rendu : *"⚡ Je suis **Fixy**, votre technicien réparateur surdoué. J'ai accès à toute votre base de données, j'ai de la mémoire sur notre conversation, et je peux vous aider sur n'importe quel SAV — diagnostic, rapport, pièces, RDV, analyse de photo/PDF. Posez-moi directement votre question."*

### Résultat attendu
Un écran de démarrage épuré : uniquement le message d'intro avec "Fixy" bien visible (emoji + gras + couleur primaire), sans aucune question cliquable en dessous. L'utilisateur comprend immédiatement que Fixy est un assistant puissant et direct.