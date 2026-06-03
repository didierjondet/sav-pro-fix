## Cause du doublon

Dans `src/components/quotes/QuoteForm.tsx`, `handleSubmit` est `async` mais le bouton « Créer le devis » (`<Button type="submit">`, ligne 837) n'a aucun état `disabled` ni garde de réentrance. Tant que l'insert Supabase n'a pas répondu (latence réseau + appel de `refetch()` dans `useQuotes.createQuote`), un second clic relance `handleSubmit` → un deuxième `INSERT` est envoyé et un second devis (avec un nouveau `quote_number`) est créé.

Le `confirm()` de doublon (ligne 357) n'aide pas : il se déclenche uniquement quand un devis existant est détecté côté liste, pas pendant la soumission en cours.

## Correction (minimale, frontend uniquement)

Dans `src/components/quotes/QuoteForm.tsx` :

1. Ajouter `const [submitting, setSubmitting] = useState(false);`
2. Au tout début de `handleSubmit`, après `e.preventDefault()` : `if (submitting) return;` puis `setSubmitting(true)`, et `setSubmitting(false)` dans un `finally`.
3. Bouton ligne 837 : `disabled={submitting}` et libellé « Création… » / « Mise à jour… » pendant l'attente.

Aucun changement de logique métier, aucun changement DB, aucun autre composant touché. Conforme à la mémoire utilisateur (modification stricte, pas d'effets collatéraux).

## Vérification

Cliquer plusieurs fois rapidement sur « Créer le devis » → un seul devis créé, bouton désactivé pendant l'attente.
