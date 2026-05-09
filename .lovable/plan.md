## Objectif

1. Tracer l'envoi du questionnaire de satisfaction dans la conversation (chat + SMS) du SAV avec date/heure.
2. Mettre en évidence visuellement la zone "Description du problème" dans le formulaire de devis, comme c'est fait sur la fiche SAV.

---

## 1. Trace du questionnaire de satisfaction

**Fichier** : `src/components/sav/SatisfactionRequestButton.tsx`

Après l'envoi réussi du SMS de satisfaction (dans `sendSatisfactionRequest`, juste après `if (smsSent)`), insérer un message système dans la table `sav_messages` via `supabase.from('sav_messages').insert(...)` :

- `sav_case_id` : prop `savCaseId`
- `shop_id` : prop `shopId`
- `sender_type` : `'shop'`
- `sender_name` : `'Système'`
- `message` : `📋 Questionnaire de satisfaction envoyé par SMS le {date} à {heure} au {customerPhone}` (date/heure formatées en `fr-FR`)
- `read_by_shop: true`, `read_by_client: false`

Ainsi le message apparaît automatiquement dans `SAVMessaging` / `MessagingInterface` (qui lit `sav_messages`), avec horodatage natif `created_at`.

Aucun changement de schéma nécessaire — la table `sav_messages` existe déjà et est utilisée pareil pour les SMS.

---

## 2. Mise en évidence du champ "Description du problème" dans le devis

**Fichier** : `src/components/quotes/QuoteForm.tsx` (lignes 538–554)

Réutiliser le composant existant `ProblemDescriptionField` de `src/components/sav/ProblemDescriptionHighlight.tsx` (déjà utilisé sur la fiche SAV — même charte visuelle : bordure gauche primary, fond dégradé, icône, badge "requis").

Remplacer le bloc actuel `<div><Label>...<Textarea/></div>` par :

```tsx
<ProblemDescriptionField
  required
  action={
    <AITextReformulator
      text={deviceInfo.problemDescription}
      context="problem_description"
      onReformulated={(t) => setDeviceInfo({ ...deviceInfo, problemDescription: t })}
    />
  }
>
  <Textarea
    id="problemDescription"
    value={deviceInfo.problemDescription}
    onChange={(e) => setDeviceInfo({ ...deviceInfo, problemDescription: e.target.value })}
    placeholder="Décrivez le problème rencontré..."
    required
  />
</ProblemDescriptionField>
```

Ajouter l'import en haut du fichier.

---

## Hors périmètre

- Pas de migration DB.
- Pas de modification de `MessagingInterface` (le rendu des messages système existants suffit).
- Pas de changement sur les autres champs du formulaire devis.

## Vérification

- Clôturer un SAV → envoyer le questionnaire → vérifier qu'une ligne horodatée apparaît dans l'onglet Chat du SAV.
- Ouvrir/créer un devis → la zone "Description du problème" est visuellement encadrée comme sur le SAV.