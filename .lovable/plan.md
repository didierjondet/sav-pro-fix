

## Audit SEO : Diagnostic et Plan d'Amelioration

### Diagnostic des problemes actuels

**1. L'outil SEO du Super Admin ne sert a RIEN actuellement**
La config SEO est sauvegardee en base de donnees mais jamais injectee dans le HTML. Les meta tags dans `index.html` sont statiques et jamais mis a jour. C'est un formulaire decoratif.

**2. Problemes critiques dans `index.html`**
- `<html lang="en">` au lieu de `<html lang="fr">` (signal negatif pour Google FR)
- Title : `fixway.fr` — pas de mots-cles
- Description : `"Logiciel SAV, Application SAV smartphone, consoles, highttech. gratuit."` — faute de frappe, trop court, mal optimise
- OG image pointe vers `lovable.dev` au lieu d'une image propre a FixwayPro
- Twitter site pointe vers `@lovable_dev`
- Aucun JSON-LD / structured data
- Aucun sitemap.xml
- robots.txt basique sans sitemap reference

**3. Problemes SPA (Single Page Application)**
Google a du mal a indexer les SPA React. Le contenu de la landing page est rendu cote client, invisible au crawl initial.

**4. Pas de pages SEO dedicees**
Les pages `/features`, `/about`, `/contact` existent mais ne sont pas referencees dans un sitemap et n'ont pas de canonical URLs.

---

### Plan d'implementation

#### Etape 1 : Optimiser `index.html` en dur (impact immediat)
- Changer `lang="en"` → `lang="fr"`
- Title : `FixwayPro — Logiciel SAV Gratuit pour Réparateurs | Gestion SAV Smartphone & High-Tech`
- Meta description optimisee avec mots-cles cibles : "logiciel sav", "application sav", "logiciel sav gratuit", "gestion sav smartphone"
- OG/Twitter tags avec image et descriptions propres a FixwayPro
- Ajouter les mots-cles meta (meme si moins important, ca ne coute rien)
- Ajouter un lien canonical
- Ajouter le JSON-LD `SoftwareApplication` + `Organization` directement dans le HTML

#### Etape 2 : Creer un vrai `sitemap.xml` statique dans `/public`
Pages indexables : `/`, `/features`, `/about`, `/contact`, `/landing`
Mettre a jour `robots.txt` avec reference au sitemap.

#### Etape 3 : Enrichir le contenu semantique de la landing page
- Ajouter des balises `<h1>`, `<h2>`, `<h3>` avec des mots-cles strategiques dans les composants
- Ajouter une section FAQ (schema.org FAQPage) — tres puissant pour le SEO "logiciel sav gratuit"
- Ajouter des `alt` text sur toutes les images
- Ajouter un breadcrumb schema

#### Etape 4 : Rendre l'outil SEO du Super Admin fonctionnel
- Injecter dynamiquement les meta tags depuis la config DB dans la landing page via `document.title` et meta tags dynamiques au montage du composant Landing
- Appliquer le Google Analytics ID et Google Site Verification depuis la config

---

### Details techniques

**Fichiers modifies :**

1. **`index.html`** — Refonte complete des meta tags, ajout JSON-LD, lang="fr", canonical, keywords
2. **`public/sitemap.xml`** — Nouveau fichier avec les URLs publiques
3. **`public/robots.txt`** — Ajouter `Sitemap: https://www.fixwaypro.com/sitemap.xml`
4. **`src/pages/Landing.tsx`** — Injecter dynamiquement title/description depuis la config SEO DB au montage + fallback sur les valeurs en dur optimisees
5. **`src/components/landing/HeroSection.tsx`** — Ameliorer la semantique HTML (h1 avec mots-cles)
6. **`src/components/landing/LandingFooter.tsx`** — Ajouter des liens internes vers /features, /about, /contact
7. **Nouveau : `src/components/landing/FAQSection.tsx`** — Section FAQ avec schema.org FAQPage JSON-LD integre (cible les requetes "logiciel sav gratuit", "application sav")

**JSON-LD dans index.html :**
```text
SoftwareApplication:
  name: FixwayPro
  applicationCategory: BusinessApplication
  operatingSystem: Web
  offers: { price: 0, priceCurrency: EUR }

Organization:
  name: FixwayPro
  url: https://www.fixwaypro.com
  description: ...

FAQPage (dans le composant FAQ):
  Questions cibles:
  - "Qu'est-ce qu'un logiciel SAV ?"
  - "FixwayPro est-il vraiment gratuit ?"
  - "Quelle est la difference entre un logiciel SAV et un tableur ?"
  - "Comment suivre une reparation en ligne ?"
```

**Mots-cles cibles pour la description et le contenu :**
- logiciel sav
- application sav
- logiciel sav gratuit
- gestion sav smartphone
- logiciel reparation telephone
- suivi sav en ligne
- logiciel sav high-tech

