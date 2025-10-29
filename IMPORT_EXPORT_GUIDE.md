# Guide Import/Export Simplifié

## Pour les utilisateurs finaux

### Export
1. Aller dans **Paramètres** → **Import/Export**
2. Cliquer sur "📥 Exporter" pour le type de données souhaité (Pièces, Clients, Devis ou SAV)
3. Le fichier Excel est téléchargé automatiquement

### Modification
4. Ouvrir le fichier Excel téléchargé
5. Modifier les données selon vos besoins :
   - ✅ Ajouter de nouvelles lignes
   - ✅ Modifier des valeurs existantes
   - ✅ Supprimer des lignes
6. Sauvegarder le fichier

### Import
7. Revenir dans **Paramètres** → **Import/Export**
8. Cliquer sur "📤 Importer" pour le même type de données
9. Sélectionner le fichier Excel modifié
10. Choisir le mode :
    - **Fusionner** : Ajoute les nouvelles données aux données existantes
    - **Remplacer** : Supprime toutes les données existantes et les remplace
11. Cliquer sur "Importer" → Import automatique ! ✅

---

## Mode d'importation

### Mode Fusionner (recommandé)
- ✅ Conserve vos données existantes
- ✅ Ajoute uniquement les nouvelles lignes
- ✅ Met à jour les lignes existantes si l'ID correspond
- ⚠️ Plus sûr pour éviter les pertes de données

### Mode Remplacer (attention)
- ⚠️ Supprime TOUTES les données existantes du type sélectionné
- ✅ Remplace par les données du fichier importé
- ⚠️ Utilisez ce mode uniquement si vous êtes certain de vouloir tout remplacer

---

## Mode avancé

Pour les utilisateurs expérimentés, un **mode avancé** est accessible via le lien "⚙️ Import avancé" :

- 🔧 Importer depuis d'autres systèmes (Fixway, etc.)
- 🔧 Mapper manuellement les colonnes si le format n'est pas reconnu
- 🔧 Créer des configurations personnalisées de mapping

---

## Pour les développeurs

### Formats supportés en auto-détection

#### Parts (Pièces)
- `name` : Nom de la pièce
- `reference` : Référence
- `quantity` : Quantité en stock
- `purchase_price` : Prix d'achat
- `selling_price` : Prix de vente
- `min_stock` : Stock minimum
- `location` : Emplacement
- `supplier` : Fournisseur

#### Customers (Clients)
- `first_name` : Prénom
- `last_name` : Nom
- `email` : Email
- `phone` : Téléphone
- `address` : Adresse

#### Quotes (Devis)
- `quote_number` : Numéro de devis
- `customer_name` : Nom du client
- `customer_email` : Email du client
- `customer_phone` : Téléphone du client
- `device_brand` : Marque de l'appareil
- `device_model` : Modèle de l'appareil
- `status` : Statut (pending, accepted, rejected)
- `total_amount` : Montant total
- `notes` : Notes
- `items` : Articles (format JSON)

#### SAV
- `case_number` : Numéro de dossier
- `customer_id` : ID du client
- `sav_type` : Type de SAV
- `status` : Statut
- `device_brand` : Marque
- `device_model` : Modèle
- `imei` : Numéro IMEI/Série
- `pattern_lock` : Code de verrouillage
- `issue_description` : Description du problème
- `diagnostic` : Diagnostic
- `total_cost` : Coût total
- `total_time_minutes` : Temps total (minutes)
- `notes` : Notes

---

### Détection automatique

Le système détecte automatiquement le format basé sur les en-têtes de colonnes :

- **Seuil de détection** : 60% de correspondance minimum entre les colonnes du fichier et les colonnes attendues
- **Tolérance** : Le système ignore les différences de casse, accents, espaces et caractères spéciaux
- **Matching flexible** : Plusieurs variations de noms de colonnes sont acceptées (ex: "telephone", "téléphone", "phone", "tel")

### Architecture technique

#### Composants principaux

1. **ImportDialog.tsx** : Composant de routage entre mode simple et avancé
2. **SimpleImport.tsx** : Interface simplifiée avec auto-détection
3. **ImportCustomers.tsx, ImportQuotes.tsx, ImportSAVs.tsx** : Composants avancés avec mapping manuel

#### Utilitaires (importHelpers.ts)

- `detectOwnExportFormat()` : Détecte si le fichier provient d'un export du système
- `createAutoMapping()` : Génère automatiquement le mapping colonnes → champs
- `findMatchingColumn()` : Trouve la meilleure correspondance pour un nom de colonne
- `normalizeColumnName()` : Normalise les noms de colonnes pour comparaison

---

## Résolution de problèmes

### Le format n'est pas détecté automatiquement
- ✅ Vérifiez que vous importez le bon type de données
- ✅ Assurez-vous que les en-têtes de colonnes n'ont pas été supprimés
- ✅ Utilisez le mode avancé pour mapper manuellement les colonnes

### L'import échoue
- ✅ Vérifiez que les données respectent les contraintes (ex: email valide, numéros corrects)
- ✅ Consultez les logs d'erreur affichés dans l'interface
- ✅ En mode "Remplacer", assurez-vous d'avoir une sauvegarde de vos données

### Données manquantes après import
- ✅ Vérifiez le mode d'importation choisi (Fusionner vs Remplacer)
- ✅ Si mode "Remplacer" utilisé par erreur, restaurez depuis une sauvegarde

---

## Bonnes pratiques

1. ✅ **Toujours faire un export avant un import massif** (backup)
2. ✅ **Tester avec un petit fichier** avant d'importer des milliers de lignes
3. ✅ **Utiliser le mode Fusionner** sauf si vous voulez repartir de zéro
4. ✅ **Vérifier l'aperçu** avant de confirmer l'import
5. ✅ **Garder les ID originaux** si vous modifiez des données existantes

---

## Support

Pour toute question ou problème :
- 📧 Contactez le support technique
- 📖 Consultez la documentation complète
- 🐛 Signalez les bugs via le système de tickets
