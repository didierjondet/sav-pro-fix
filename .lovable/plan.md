
Plan de correction immédiate

Diagnostic confirmé
- Le bandeau FixWay en bas a bien été réintroduit en dur : `src/components/layout/Footer.tsx`, puis réaffiché dans `src/pages/Index.tsx` et `src/pages/Agenda.tsx`.
- La disparition du logo et du nom du magasin dans le header vient très probablement d’une régression du mode “prise en main” : `ShopContext` lit `fixway_impersonated_shop_id` même pour un utilisateur normal. Si cette clé est restée en localStorage après un passage super admin, le header ne charge plus la bonne boutique.
- C’est aussi la raison la plus probable du retour des assistants IA : sur le dashboard, si `shop` n’est pas correctement chargé, `ai_modules_config` retombe sur `{}` et les assistants sont réaffichés par défaut.
- L’horodatage de clôture n’apparaît pas dans le document de restitution parce que la correction a été faite dans `src/components/sav/SAVPrint.tsx`, alors que le vrai document de restitution est généré par `generateSAVRestitutionPDF` dans `src/utils/pdfGenerator.ts`.

Plan d’implémentation

1. Supprimer la régression du footer FixWay
- Retirer le rendu du footer interne sur les pages concernées (`Index`, `Agenda`) ou neutraliser `Footer.tsx` pour revenir au comportement sans bandeau bas.
- Ne pas réinjecter de branding FixWay non demandé dans l’interface connectée.

2. Restaurer correctement la boutique dans le header
- Corriger `src/contexts/ShopContext.tsx` pour que l’impersonation ne soit prise en compte que si le profil réel est `super_admin`.
- Si l’utilisateur n’est pas super admin, ignorer la clé `fixway_impersonated_shop_id` et nettoyer cet état parasite.
- Garantir que le `shop_id` utilisé par le header vient de la vraie boutique du profil normal.
- Résultat attendu : retour du logo, du nom du magasin et des infos d’en-tête.

3. Rebloquer les assistants masqués dans les réglages
- Conserver la lecture de `ai_modules_config`, mais faire un rendu “fail closed” dans `src/pages/Index.tsx` :
  - si `shop` n’est pas encore chargé, ne rien afficher
  - n’afficher les assistants que si la config boutique est réellement disponible et active
- Ainsi, même en cas de chargement incomplet, les assistants ne réapparaîtront pas par défaut.

4. Corriger le vrai document de restitution
- Modifier `src/utils/pdfGenerator.ts` dans `generateSAVRestitutionPDF`.
- Avant génération, recharger le SAV le plus récent depuis la base avec :
  - `closure_history`
  - données client utiles
  - données éventuellement modifiées juste avant impression
- Ajouter un bloc visible “Clôture / Historique des clôtures” avec pour chaque entrée :
  - date et heure exactes de clôture
  - statut de clôture utilisé
  - nom de l’utilisateur ayant clôturé
- Afficher en priorité la dernière clôture, tout en conservant l’historique complet si le SAV a été rouvert puis re-clôturé.

5. Sécuriser le flux de clôture + impression
- Corriger le flux de `SAVCloseUnifiedDialog.tsx` pour éviter d’imprimer un document avant que la clôture soit réellement enregistrée.
- Faire en sorte que l’impression utilise les données déjà sauvegardées, pas l’ancien état local du SAV.
- Vérifier aussi le bouton “Imprimer restitution” de `SAVDetail.tsx` pour qu’il s’appuie lui aussi sur les données fraîches.

6. Compacter fortement le document sur A4
- Revoir la mise en page de `generateSAVRestitutionPDF` :
  - marges réduites
  - blocs plus serrés
  - grille d’infos plus dense
  - tableau pièces plus compact
  - commentaires et signatures moins gourmands en hauteur
  - suppression des espaces verticaux inutiles
- Objectif : garder un document clair, lisible et le plus souvent sur une seule page A4.

Fichiers à corriger
- `src/contexts/ShopContext.tsx`
- `src/pages/Index.tsx`
- `src/components/layout/Footer.tsx`
- `src/pages/Agenda.tsx`
- `src/utils/pdfGenerator.ts`
- `src/components/sav/SAVCloseUnifiedDialog.tsx`
- `src/pages/SAVDetail.tsx`

Détail technique important
- Le problème d’horodatage n’est pas dans le bouton `SAVPrintButton`, mais dans le générateur `generateSAVRestitutionPDF`.
- Le problème header + assistants vient d’un état d’impersonation frontend qui “fuit” hors du super admin.
- Je corrigerai donc la source réelle de chaque régression, sans toucher au reste du comportement métier.
