# Pages légales et RGPD + formulaire de contact fonctionnel

## Vos réglages de connexion
- **Supabase :** la liste que vous gardez (fixway.fr, www.fixway.fr, logicielsav.com) est la bonne. Vous pouvez supprimer les 7 adresses Lovable cochées. Vérifiez aussi que la « Site URL », juste au-dessus, est bien `https://fixway.fr`.
- **Google :**
  - Domaine autorisé 3 : remplacer `supabase.com` par **`supabase.co`** (c'est l'adresse qui apparaît sur l'écran Google).
  - Les liens « règles de confidentialité » et « conditions d'utilisation » pointeront vers les nouvelles pages (`https://fixway.fr/confidentialite` et `https://fixway.fr/cgu`). Google les exige pour valider votre branding.

## Société (registre public)
- SAS HAPICS, capital 10 000 €
- 34 rue du Docteur Abel, 26000 Valence (Drôme)
- SIREN 803 138 577, RCS Romans, TVA FR54803138577, APE 58.29A
- Président et directeur de la publication : Christophe Jondet
- Contact : **dpmockup@gmail.com** uniquement, aucun téléphone
- Hébergeur : le prestataire d'hébergement du site
- Données : Supabase (serveurs dans l'Union européenne, à confirmer de votre côté)

## Pages créées (publiques, en français, au design du site)
- `/mentions-legales` : éditeur, directeur de la publication, hébergeur, propriété intellectuelle.
- `/cgu` : conditions d'utilisation pour les magasins (comptes pro, espaces SAV) et pour les particuliers (suivi, devis, Mon espace, rachat).
- `/cgv` : abonnements Premium et Enterprise, packs SMS, paiement, résiliation, rétractation (non applicable entre professionnels), responsabilité.
- `/confidentialite` : politique RGPD. Responsable de traitement, données collectées (magasins, clients particuliers, vendeurs), finalités, bases légales, durées de conservation (magasins inactifs supprimés après 90 jours, consentement marketing limité à 4 offres par an), sous-traitants (hébergement, envoi SMS et e-mail, IA), droits des personnes et comment les exercer (par e-mail), recours auprès de la CNIL.
- `/cookies` : seulement les cookies nécessaires (connexion) et la mesure d'usage interne. Pas de publicité.
- Liens vers ces pages dans le pied de page, la page de connexion, l'étape de création du compte particulier et Mon espace.

## Mode discret
Comme demandé, le mode discret disparaît : les pages légales et le nom SAS HAPICS sont toujours affichés (c'est une obligation légale). On retire le bouton du Super Admin et le remplacement de HAPICS par « Didier Jondet ».

## Page Contact
- Plus de téléphone, plus d'adresse inventée (« Paris »). On garde uniquement l'e-mail dpmockup@gmail.com.
- Formulaire : nom, e-mail, société (facultatif), sujet, message, et une case « J'accepte que mes données soient utilisées pour répondre à ma demande » avec un lien vers la politique de confidentialité.
- L'envoi fonctionne réellement : le message arrive sur dpmockup@gmail.com, avec l'e-mail du visiteur en « répondre à ». Confirmation à l'écran, message d'erreur clair en cas d'échec.
- Protection contre les abus : vérification des champs, longueur limitée, piège anti-robot invisible. Le destinataire est fixé côté serveur : personne ne peut se servir du formulaire pour écrire à quelqu'un d'autre.

## Détails techniques
- `src/lib/legalInfo.ts` : une seule source pour les informations de la société, utilisée par toutes les pages.
- Nouvelles pages `src/pages/legal/*.tsx` et une mise en page commune `LegalLayout`. Routes publiques ajoutées dans `App.tsx`.
- `LandingFooter` : liens vers les pages au lieu de la boîte de dialogue. `LegalDocumentDialog` et `LegalVisibilityToggle` sont retirés, et `useLegalVisibility` est neutralisé (`hideLegal = false`, plus aucun masquage).
- Nouvelle fonction serveur `contact-form` : validation zod, destinataire `dpmockup@gmail.com` fixé dans le code, envoi via `send-app-email` (routage e-mail déjà configuré), échappement HTML. `Contact.tsx` réécrit pour utiliser `supabase.functions.invoke('contact-form')`.
- `send-contact-email` (qui accepte n'importe quel destinataire) : destinataire restreint à l'adresse fixée.
- Test : validation de l'envoi du formulaire et parcours Playwright sur `/contact` et les pages légales.
- Note : les textes sont des modèles sérieux, mais une relecture par un juriste reste conseillée.
