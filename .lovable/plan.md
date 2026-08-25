# Prestataires techniques (SAV externalisé)

Objectif : pouvoir confier un SAV à une entreprise tierce (micro-soudure, broker…), suivre combien de dossiers sont chez chaque prestataire, sans jamais exposer cette information au client final.

## 1. Nouvel onglet Paramètres « Prestataires techniques »

Gestion CRUD des prestataires : nom, contact (téléphone, email), adresse, spécialité(s), délai moyen annoncé, couleur d'affichage, notes, actif/inactif, et une case « Afficher dans la barre latérale » (même logique que les statuts et types SAV).

## 2. Onglet « Prestataire » dans le dossier SAV

Nouvel onglet, toujours présent, placé après « Prêt matériel ».
- Aucun prestataire : onglet neutre, bouton « Confier à un prestataire » (choix du prestataire, date d'envoi, motif, coût prévu, référence externe).
- Prestataire attribué : titre de l'onglet mis en évidence (couleur + pastille), comme pour le prêt matériel. Actions : changer de prestataire, marquer « retour reçu », retirer l'attribution.
- Historique des attributions conservé (envoyé le / revenu le / coût / motif), visible dans l'onglet.

Le type SAV d'origine (client, interne, externe…) n'est jamais modifié : on ajoute une couche d'affectation, pas un changement de type. Rien de l'existant n'est cassé.

## 3. Comptage dans la barre latérale — proposition

Pour rester lisible, une section distincte sous les types SAV et les statuts :

```text
DOSSIERS SAV
  SAV CLIENT        12
  SAV INTERNE        5
  SAV EXTERNE        3

CHEZ UN PRESTATAIRE     7
  MicroSoud Pro          4   (3 client · 1 interne)
  ReparExpress           3   (3 client)
```

Règles de comptage retenues :
- Un SAV confié reste compté dans son type d'origine (aucune perte de repère comptable, aucun trou dans les chiffres actuels).
- Il est en plus compté dans la section « Chez un prestataire », avec la répartition par type d'origine en sous-libellé au survol/à côté du compteur.
- Seuls les dossiers actifs (non terminés) et non revenus du prestataire sont comptés.
- Chaque prestataire est affiché ou masqué selon sa case « afficher dans la barre latérale ».
- Un clic filtre la liste SAV sur ce prestataire.

Un badge discret « chez <prestataire> » apparaît aussi sur les cartes de la liste SAV, et un filtre « Prestataire » est ajouté aux filtres existants.

## 4. Confidentialité côté client

- La page publique de suivi (QR code) n'affiche ni le type de SAV ni le prestataire : uniquement le numéro de dossier, le statut et les messages.
- Impression prise en charge : l'exemplaire client perd la mention du type de SAV et n'affiche jamais le prestataire ; l'exemplaire magasin conserve le type et affiche le prestataire s'il y en a un.

## 5. Détails techniques

- Migration : table `shop_sav_providers` (shop_id, name, contact_name, phone, email, address, specialties, avg_delay_days, color, notes, is_active, show_in_sidebar, display_order) avec GRANTs + RLS isolée par shop, et table `sav_provider_assignments` (sav_case_id, provider_id, shop_id, sent_at, returned_at, reason, external_ref, cost, notes) — historique complet, l'attribution courante étant la ligne sans `returned_at`.
- Hooks : `useSAVProviders` (CRUD + realtime, calqué sur `useSAVStatuses`) et `useSAVProviderAssignments`.
- Composants : `src/components/settings/SAVProvidersManager.tsx`, `src/components/sav/SAVProviderTab.tsx` ; intégration dans `src/pages/Settings.tsx`, `src/pages/SAVDetail.tsx` (vue standard + simplifiée), `src/components/layout/Sidebar.tsx`, `src/pages/SAVList.tsx`.
- Confidentialité : retrait de `sav_type` du retour de la RPC publique `get_tracking_info` et des pages `TrackSAV.tsx` / `SimpleTrack.tsx` (le calcul de délai bascule sur la valeur déjà renvoyée côté serveur) ; ajustement de la copie client dans `src/components/sav/SAVPrint.tsx`.
- Aucune donnée SAV existante n'est modifiée ou supprimée.
