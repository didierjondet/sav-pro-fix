# Regrouper les onglets de Réglages

## Constat

La page Réglages affiche aujourd'hui 18 onglets à plat sur 3 lignes (Magasin, Notifications, Apparence, Crédits SMS, Import/Export, Statuts SAV, Types de SAV, Abonnement, Facturation, TVA & MO, IA, Utilisateurs, Catégories pièces, Fournisseurs, Prestataires techniques, Vitrine partenaire, Matériel de prêt, Logs). C'est illisible et il faut chercher.

## Nouvelle organisation

Navigation à deux niveaux : une barre de 5 catégories, et à l'intérieur la liste des sections de la catégorie.

```text
[ Mon magasin ] [ Activité SAV ] [ Stock & partenaires ] [ Facturation ] [ Système ]
```

- **Mon magasin** : Magasin, Vitrine partenaire, Apparence, Notifications
- **Activité SAV** : Types de SAV, Statuts SAV, Prestataires techniques, Matériel de prêt
- **Stock & partenaires** : Catégories pièces, Fournisseurs
- **Facturation** : Abonnement, Facturation, TVA & MO, Crédits SMS
- **Système** : Utilisateurs, IA, Import/Export, Logs

Sur desktop : la catégorie sélectionnée affiche une colonne latérale gauche avec ses sections (liste verticale, icône + libellé, section active surlignée) et le contenu à droite.
Sur mobile : la barre de catégories devient déroulante horizontale et les sections s'affichent dans un menu déroulant au-dessus du contenu.

Les onglets réservés (admin, super admin, abonnement) restent filtrés comme aujourd'hui ; une catégorie vide de sections visibles n'est pas affichée.

## Compatibilité

- Les liens existants du type `/settings?tab=sav-types` continuent de fonctionner : la catégorie correspondante est sélectionnée automatiquement.
- L'URL est mise à jour avec la section active, donc les liens restent partageables.
- Aucun contenu d'onglet n'est modifié : seules la navigation et la mise en page changent.

## Détails techniques

- `src/pages/Settings.tsx` : remplacer la `TabsList` unique par un registre de sections `{ id, label, icon, category, visible }` déduit des conditions actuelles (`isAdmin`, `isSuperAdmin`, etc.). Conserver le composant `Tabs` et tous les `TabsContent value=...` inchangés ; la `TabsList` devient la colonne latérale filtrée par catégorie, plus une barre de catégories au-dessus.
- État local `activeCategory` synchronisé avec la section active et le paramètre d'URL `tab`.
- Aucun changement de base de données, aucune modification des composants de contenu.
