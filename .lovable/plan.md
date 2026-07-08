# Doublons clients — cause et correctifs

## Constat (données réelles)

Requête sur la table `customers` : la grande majorité des doublons ont exactement **le même téléphone**, **le même nom/prénom**, et sont créés **dans un intervalle de 4 à 15 secondes** (parfois 4 fois en 3 secondes). Exemples :

- `xavier rocheteau` — 2 créations à 4,8 s d'intervalle
- `maison d enfant de baldy` — 4 créations en 15 s
- `mathieu samani` — 4 créations en 80 s
- `rené guinhut` — 11 créations le même jour

Ce n'est donc pas un chemin oublié dans le code : c'est une **race condition de double-clic**.

## Cause racine

Dans `useCustomers.createCustomer` la protection anti-doublon fonctionne en 2 étapes non atomiques :
1. `SELECT` pour chercher un nom identique
2. `INSERT` si rien n'est trouvé

Quand l'utilisateur clique 2 fois rapidement sur "Créer" (SAVForm, SAVWizardDialog, QuoteForm, EditSAVCustomerDialog, CustomerForm), les 2 handlers partent en parallèle. `setLoading(true)` est asynchrone et ne bloque pas la 2e invocation avant que React re-rende le bouton `disabled`. Les 2 SELECT reviennent vides en même temps, puis les 2 INSERT passent. Résultat : 2 (ou plus) lignes identiques.

En plus, la détection actuelle ne compare que `first_name + last_name` (insensible à la casse). Si le téléphone est identique mais que l'utilisateur retape avec une variation (accent, espace en trop, orthographe différente), rien n'est bloqué.

## Correctifs (frontend uniquement, aucun changement UI)

### 1. Verrou synchrone anti-réentrée dans `useCustomers.ts`
- Ajouter un `useRef<boolean>` `isCreatingRef` incrémenté **synchroniquement** en début de `createCustomer` et remis à `false` dans un `finally`.
- Si un appel arrive alors que `isCreatingRef.current === true`, retourner immédiatement `{ data: null, error: new Error('Création déjà en cours') }` sans toast (silencieux — c'est un double-clic).
- Ce verrou bloque les créations parallèles même si `setLoading` n'a pas encore re-rendu.

### 2. Détection anti-doublon élargie au téléphone
Dans `createCustomer`, ajouter avant l'insert :
- Match par téléphone normalisé (`replace(/\D/g, '')`) si un phone est fourni : renvoyer le client existant (retourner `{ data: existingCustomer, error: null }`) plutôt qu'une erreur, pour que le flux SAV/Quote continue avec le bon `customer_id`.
- Idem si l'email existe déjà : retourner le client existant.
- Match nom+prénom : garder le comportement actuel (erreur bloquante) **mais** aussi retourner le client existant pour le flux SAV, afin que double-clic → 2e appel réutilise le client fraîchement créé au lieu d'échouer.

Comportement final : un double-clic ne crée plus jamais 2 lignes ; le 2e appel réutilise silencieusement la ligne créée par le 1er.

### 3. Désactivation stricte des boutons de soumission
Vérifier et durcir `disabled={loading}` sur les boutons "Créer" de :
- `src/components/sav/SAVForm.tsx`
- `src/components/sav/SAVWizardDialog.tsx` (déjà `disabled={loading}` ligne 1115, OK)
- `src/components/quotes/QuoteForm.tsx`
- `src/components/customers/CustomerForm.tsx`
- `src/components/sav/EditSAVCustomerDialog.tsx`

Le `useRef` du point 1 reste le vrai garde-fou ; le `disabled` est complémentaire.

## Détails techniques

**Fichiers modifiés :**
- `src/hooks/useCustomers.ts` : verrou `isCreatingRef`, matching phone/email retourne l'existant, matching name retourne l'existant au lieu d'échouer
- `src/components/sav/SAVForm.tsx` : s'assurer que `disabled={loading}` couvre bien le bouton final
- `src/components/quotes/QuoteForm.tsx` : idem
- `src/components/customers/CustomerForm.tsx` : idem (déjà `disabled={loading}`, à vérifier)
- `src/components/sav/EditSAVCustomerDialog.tsx` : idem

**Non fait dans ce plan (à valider séparément si souhaité) :**
- Index unique partiel Postgres sur `(shop_id, lower(trim(first_name)), lower(trim(last_name)), regexp_replace(coalesce(phone,''), '\D', '', 'g'))` — nécessiterait de dédoublonner d'abord la base via le gestionnaire de doublons existant, sinon la migration échouerait. À proposer une fois le stock nettoyé.
- Nettoyage automatique des doublons déjà présents : peut être fait via le gestionnaire de doublons existant (page Clients).

## Résultat attendu

- Double-clic sur "Créer" (SAV, devis, client, édition SAV) → **1 seule ligne** créée, le 2e clic réutilise silencieusement la 1re.
- Si téléphone identique déjà présent → réutilisation du client existant sans nouvel enregistrement.
- Aucun changement visuel ni de layout.
