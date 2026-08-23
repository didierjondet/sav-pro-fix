# Fusion des onglets « Impression » et « Documents »

Dans un SAV, les deux onglets « Impression » et « Documents » sont réunis en un seul onglet « Documents », identique dans la vue standard et la vue simplifiée.

## Nouvel onglet « Documents »

Ordre d'affichage, les impressions d'abord :

1. Document de prise en charge (bouton d'impression)
2. Document de restitution (uniquement quand l'appareil est prêt, comme aujourd'hui)
3. Étiquette / QR code (zone code-barres et impression étiquette)
4. Documents administratifs (certificat d'irréparabilité et ses archives)
5. Pièces jointes du dossier

Pour éviter une page trop longue, les trois blocs d'impression sont regroupés dans une seule carte « Impressions » avec des sous-sections, placée en haut ; le certificat et les pièces jointes suivent en dessous.

## Détails techniques

- `src/pages/SAVDetail.tsx` : supprimer le `TabsTrigger`/`TabsContent` `impression` dans les deux vues (simplifiée ~l.420/586 et standard ~l.825/1129), déplacer son contenu au début du `TabsContent value="documents"`.
- Rediriger l'onglet actif vers `documents` si `impression` était mémorisé/valeur par défaut, pour éviter un onglet vide.
- Aucun changement de logique métier : les composants `SAVPrintButton`, `SAVBarcode`, `generateSAVRestitutionPDF`, `NonRepairabilityCertificateDialog` et `SAVDocuments` sont réutilisés tels quels.
