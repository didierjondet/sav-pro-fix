# Améliorer la catégorisation des SAV (widget « Répartition du CA »)

## Constat

Le classement actuel (`categorizeDevice` dans `src/hooks/useStatistics.ts`) s'appuie sur une comparaison stricte de la marque à une liste blanche + quelques regex sur le modèle. Résultat : dès qu'un utilisateur saisit une variante (faute de frappe, champ inversé, marque tronquée, numéro à la place de la marque…), le SAV bascule en « Autres ».

Vérification en base pour le mois en cours — les SAV rangés à tort dans « Autres » sont bien des téléphones :

- `SAMASUNG / S21 FE` (typo Samsung)
- `SASMUNG / A25 5G` (typo Samsung)
- `APP / IPHONE 14 PRO 128GB SILVER` (marque tronquée)
- `IPHONE / 12 PRO MAX` (marque et modèle inversés)
- `14 PRO / APPLE` (marque et modèle inversés)
- `075627082289 / IPHONE 12` (numéro de téléphone dans la marque)

Les autres lignes (ASUS/HP/DELL/LENOVO portables, bijou, cafetière, casque, vélo) restent correctement hors « Téléphones ».

## Objectif

Rendre la catégorisation tolérante aux fautes en combinant trois niveaux de signaux :
1. **Normalisation** systématique des champs (majuscules, sans accent, sans ponctuation, numéros purs filtrés).
2. **Détection déterministe** enrichie (alias de marques, distance de Levenshtein, patterns marque/modèle inversés, fusion marque+modèle).
3. **Confirmation IA optionnelle** sur le champ « panne / description du problème » quand les règles déterministes retournent `Autres`, afin de reclasser à partir des indices textuels (« écran iPhone cassé », « batterie Galaxy S21 »…).

Aucun changement d'UI, aucun changement de schéma. Seul le pipeline de classement évolue, avec un cache pour ne pas rappeler l'IA à chaque rendu.

## Étapes

### 1. Utilitaire de normalisation (`src/lib/deviceCategorization.ts`)

Extraire la logique du hook vers un module dédié :
- `normalizeText(str)` : `toUpperCase()`, retrait des accents (`normalize('NFD').replace(/[\u0300-\u036f]/g,'')`), compactage des espaces, suppression de la ponctuation superflue, retrait des séquences purement numériques de plus de 6 chiffres (numéros de téléphone).
- `brandAliases` : map des fautes fréquentes observées en base → marque canonique (`SAMASUNG|SASMUNG|SAMSNUG → SAMSUNG` ; `APP|APPLR|APLE|IPHONE → APPLE` ; `HAUWEI → HUAWEI` ; `XIOMI → XIAOMI` ; `REDMII → REDMI`…). Structure ouverte pour ajouts futurs.
- Résolution de marque : alias exact → sinon distance de Levenshtein ≤ 2 sur la liste des marques téléphones connues → sinon marque brute.

### 2. Refonte `categorizeDevice` (déterministe, sans IA)

Travailler sur `combined = normalizeText(brand) + " " + normalizeText(model)` avec la marque résolue :
- **Consoles** : mots-clés `PS3|PS4|PS5|XBOX|SWITCH|JOY.?CON|DUALSENSE|DUALSHOCK|MANETTE|NINTENDO|PLAYSTATION`.
- **Tablettes** : `IPAD|GALAXY TAB|TAB S\d|TAB A\d|SURFACE|MEDIAPAD|MATEPAD|TABLETTE`.
- **Informatique** : marques PC (ASUS, HP, DELL, LENOVO, ACER, MSI…) + mots-clés `MACBOOK|IMAC|MAC MINI|MAC STUDIO|LAPTOP|NOTEBOOK|PROBOOK|IDEAPAD|VIVOBOOK|THINKPAD|PAVILION|INSPIRON|LATITUDE|XPS|SWIFT|PREDATOR|OMEN|TUF|ROG|LOQ|ASPIRE|SSD|HDD|RAM|GPU|CPU`.
- **Téléphones** (évalué après les 3 catégories ci-dessus) :
  - marque canonique résolue dans la liste téléphones, OU
  - modèle contenant `IPHONE|GALAXY [SAMFZ]\d|REDMI|PIXEL|MATE|XPERIA|SMARTPHONE|POCO|FIND X|RENO|ONEPLUS|NORD|ZFLIP|Z FLIP|ZFOLD|Z FOLD`, OU
  - pattern iPhone marque-libre (`^\d{1,2}(\s|$)`, `\d{1,2}\s?(PRO|PRO MAX|MINI|PLUS)`, `^XS|^XR|^SE\b`) quand la marque est `APPLE`, vide, ou tombe côté modèle (inversion marque/modèle : détection croisée), OU
  - pattern Samsung marque-libre : `^[SAMFZ]\d{1,2}(\s|FE|ULTRA|PLUS|\+)?`.
- **Fallback** : `Autres` — mais on ne s'y arrête pas encore, on tente l'étape 3.

### 3. Analyse IA complémentaire sur la panne (fallback)

Quand la règle déterministe retourne `Autres` **et** qu'un texte de panne (`problem_description`) est disponible, appeler l'IA via une nouvelle Edge Function `classify-sav-category` pour trancher à partir du texte :

- **Fonction** `supabase/functions/classify-sav-category/index.ts` :
  - Entrée : `{ brand, model, problem_description }` (déjà normalisés côté client).
  - Modèle : `google/gemini-3.6-flash` via la Lovable AI Gateway (rapide, économique, adapté à une classification simple).
  - Prompt : renvoyer une catégorie parmi `Téléphones | Informatique | Consoles | Tablettes | Autres` en s'appuyant sur les indices marque + modèle + description (« écran cassé », « batterie iPhone », « clavier PC »…).
  - Sortie structurée via `Output.object` (schéma minimal `{ category: 'Téléphones' | ... , confidence: number }`).
  - Gestion 402/429 : renvoyer `Autres` sans faire échouer la requête.

- **Côté hook** :
  - Cache en mémoire par SAV (`Map<caseId, category>`) et cache localStorage `fixway_sav_category_cache_v1` (clé = hash `brand|model|desc`).
  - Batch : rassembler les cas déterministes = `Autres` sur la période, appeler la fonction en lot (une requête, tableau d'entrées) pour limiter le coût.
  - Recalcul déclenché uniquement à la (re)construction des stats — pas à chaque render.
  - Log dev `console.debug` des cas où l'IA a reclassé, pour enrichir `brandAliases` plus tard.

### 4. Vérification manuelle

Dérouler la chaîne sur l'échantillon confirmé en base :
- Doivent passer en `Téléphones` : SAMASUNG S21 FE, SASMUNG A25 5G, APP IPHONE 14 PRO…, IPHONE 12 PRO MAX, 14 PRO / APPLE, 075627082289 / IPHONE 12.
- Doivent rester en `Informatique` : ASUS TUF, HP PAVILION, DELL XPS, LENOVO LOQ, MSI, ACER SWIFT.
- Doivent rester en `Consoles` : NINTENDO JOYCON, SONY PS5.
- Doivent rester en `Tablettes` : APPLE IPAD 7.
- Doivent rester en `Autres` : bijouterie, cafetière Bosch Tassimo, casque Marshall, vélo (l'IA doit confirmer que la description ne suggère aucun appareil électronique).

## Hors périmètre

- Aucune modification du widget lui-même, ni des couleurs, ni de l'UI.
- Aucun changement de schéma DB, aucune recatégorisation historique en base (la fonction s'applique à la volée).
- Aucun rewriting/normalisation des données stockées : on lit tel quel, on normalise pour catégoriser.
