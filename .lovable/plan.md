# Affichage de l'appareil sur les devis

La marque et le modèle sont bien enregistrés en base (`device_brand`, `device_model`, `device_imei` sur la table `quotes`) mais ne sont affichés nulle part dans les vues du devis. À corriger aux 3 endroits où le devis est consulté.

## 1. `src/components/quotes/QuoteView.tsx` (modale de visualisation interne)
Ajouter, dans le bloc d'informations en haut (après le téléphone client / date de création), un encart "Appareil concerné" qui affiche :
- Marque + Modèle (concaténés, ex. `APPLE iPhone 12`)
- IMEI / N° de série si renseigné
- Ne rien afficher si les 3 champs sont vides (rétro-compatibilité avec les anciens devis).

## 2. `src/utils/pdfGenerator.ts` → `generateQuotePDF`
Ajouter une section "Appareil" dans le HTML du PDF, juste après le bloc client (autour de la ligne 152), avec le même rendu que pour les SAV (`device_brand` + `device_model`, puis IMEI sur une ligne séparée). Conditionnel : on n'imprime la section que si au moins un champ est renseigné.

## 3. `src/pages/QuotePublic.tsx` (page publique consultée par le client via SMS)
Le type `device_brand`/`device_model` est déjà déclaré mais jamais rendu. Ajouter un bloc "Votre appareil" responsive (même style que les autres cartes d'info de la page) affichant marque, modèle et IMEI, conditionnel.

## Hors périmètre
- Aucune modification de la base de données ni des hooks (`useQuotes`, `quote-public` edge function) : les données sont déjà persistées et renvoyées.
- Aucun changement du formulaire de création/édition.
