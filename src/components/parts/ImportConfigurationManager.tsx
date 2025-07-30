import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  ArrowUp, 
  ArrowDown,
  AlertCircle 
} from 'lucide-react';
import { useImportConfigurations, type ColumnMapping, type ImportConfiguration } from '@/hooks/useImportConfigurations';

interface ImportConfigurationManagerProps {
  onConfigurationChange?: (config: ImportConfiguration) => void;
}

export function ImportConfigurationManager({ onConfigurationChange }: ImportConfigurationManagerProps) {
  const { configurations, isLoading, createConfiguration, updateConfiguration, deleteConfiguration } = useImportConfigurations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ImportConfiguration | null>(null);
  const [newConfigName, setNewConfigName] = useState('');
  const [workingMappings, setWorkingMappings] = useState<ColumnMapping[]>([]);
  const [isDefault, setIsDefault] = useState(false);

  const defaultMappings: ColumnMapping[] = [
    { field_name: 'marque', column_name: 'Marque', required: true, type: 'text' },
    { field_name: 'model', column_name: 'Model', required: true, type: 'text' },
    { field_name: 'pieces', column_name: 'Pieces', required: true, type: 'text' },
    { field_name: 'quantity', column_name: 'QT', required: false, type: 'number', default: 0 },
    { field_name: 'fournisseur', column_name: 'Fournisseur', required: false, type: 'text' },
    { field_name: 'selling_price', column_name: 'Prix public', required: false, type: 'number', default: 0 },
    { field_name: 'purchase_price', column_name: 'Prix achat ht', required: false, type: 'number', default: 0 },
    { field_name: 'min_stock', column_name: 'Stock mini', required: false, type: 'number', default: 5 },
  ];

  const availableFields = [
    { value: 'marque', label: 'Marque', required: true },
    { value: 'model', label: 'Modèle', required: true },
    { value: 'pieces', label: 'Pièces', required: true },
    { value: 'quantity', label: 'Quantité' },
    { value: 'fournisseur', label: 'Fournisseur' },
    { value: 'selling_price', label: 'Prix de vente' },
    { value: 'purchase_price', label: 'Prix d\'achat' },
    { value: 'min_stock', label: 'Stock minimum' },
    { value: 'reference', label: 'Référence' },
    { value: 'notes', label: 'Notes' },
  ];

  const openNewConfigDialog = () => {
    setEditingConfig(null);
    setNewConfigName('');
    setWorkingMappings([...defaultMappings]);
    setIsDefault(false);
    setIsDialogOpen(true);
  };

  const openEditConfigDialog = (config: ImportConfiguration) => {
    setEditingConfig(config);
    setNewConfigName(config.name);
    setWorkingMappings([...config.column_mappings]);
    setIsDefault(config.is_default);
    setIsDialogOpen(true);
  };

  const handleSaveConfiguration = async () => {
    if (!newConfigName.trim()) return;

    const success = editingConfig
      ? await updateConfiguration(editingConfig.id, {
          name: newConfigName,
          column_mappings: workingMappings,
          is_default: isDefault,
        })
      : await createConfiguration(newConfigName, workingMappings, isDefault);

    if (success) {
      setIsDialogOpen(false);
      if (onConfigurationChange) {
        const config = editingConfig 
          ? { ...editingConfig, name: newConfigName, column_mappings: workingMappings, is_default: isDefault }
          : { id: '', shop_id: '', name: newConfigName, column_mappings: workingMappings, is_default: isDefault, required_columns: [], created_at: '', updated_at: '' };
        onConfigurationChange(config);
      }
    }
  };

  const addMapping = () => {
    const usedFields = workingMappings.map(m => m.field_name);
    const availableField = availableFields.find(f => !usedFields.includes(f.value));
    
    if (availableField) {
      const newMapping: ColumnMapping = {
        field_name: availableField.value,
        column_name: availableField.label,
        required: availableField.required || false,
        type: ['selling_price', 'purchase_price', 'quantity', 'min_stock'].includes(availableField.value) ? 'number' : 'text',
        default: availableField.value.includes('price') || availableField.value === 'quantity' ? 0 : 
                availableField.value === 'min_stock' ? 5 : undefined,
      };
      setWorkingMappings([...workingMappings, newMapping]);
    }
  };

  const removeMapping = (index: number) => {
    const mapping = workingMappings[index];
    if (mapping.required) return; // Can't remove required fields
    
    setWorkingMappings(workingMappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, updates: Partial<ColumnMapping>) => {
    const newMappings = [...workingMappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    setWorkingMappings(newMappings);
  };

  const moveMapping = (index: number, direction: 'up' | 'down') => {
    const newMappings = [...workingMappings];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newMappings.length) {
      [newMappings[index], newMappings[targetIndex]] = [newMappings[targetIndex], newMappings[index]];
      setWorkingMappings(newMappings);
    }
  };

  const handleSetDefault = async (config: ImportConfiguration) => {
    await updateConfiguration(config.id, { is_default: true });
    if (onConfigurationChange) {
      onConfigurationChange({ ...config, is_default: true });
    }
  };

  if (isLoading) {
    return <div>Chargement des configurations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurations d'import
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewConfigDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle configuration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Modifier la configuration' : 'Nouvelle configuration d\'import'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="config-name">Nom de la configuration</Label>
                  <Input
                    id="config-name"
                    value={newConfigName}
                    onChange={(e) => setNewConfigName(e.target.value)}
                    placeholder="Ex: Import fournisseur X"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-default"
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                  />
                  <Label htmlFor="is-default">Configuration par défaut</Label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Mapping des colonnes</h4>
                  <Button onClick={addMapping} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une colonne
                  </Button>
                </div>

                <div className="space-y-3">
                  {workingMappings.map((mapping, index) => (
                    <Card key={index} className="p-3">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3">
                          <Label className="text-xs">Champ système</Label>
                          <Select
                            value={mapping.field_name}
                            onValueChange={(value) => {
                              const field = availableFields.find(f => f.value === value);
                              updateMapping(index, {
                                field_name: value,
                                required: field?.required || false,
                                type: ['selling_price', 'purchase_price', 'quantity', 'min_stock'].includes(value) ? 'number' : 'text',
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-3">
                          <Label className="text-xs">Nom de la colonne</Label>
                          <Input
                            value={mapping.column_name}
                            onChange={(e) => updateMapping(index, { column_name: e.target.value })}
                            placeholder="Nom dans le fichier"
                          />
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={mapping.type}
                            onValueChange={(value: 'text' | 'number') => updateMapping(index, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texte</SelectItem>
                              <SelectItem value="number">Nombre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Valeur par défaut</Label>
                          <Input
                            value={mapping.default?.toString() || ''}
                            onChange={(e) => {
                              const value = mapping.type === 'number' ? 
                                (e.target.value ? parseFloat(e.target.value) : 0) : 
                                e.target.value;
                              updateMapping(index, { default: value });
                            }}
                            type={mapping.type === 'number' ? 'number' : 'text'}
                            placeholder={mapping.type === 'number' ? '0' : 'Valeur...'}
                          />
                        </div>

                        <div className="col-span-1 flex items-center justify-center">
                          {mapping.required && (
                            <Badge variant="destructive" className="text-xs">
                              Obligatoire
                            </Badge>
                          )}
                        </div>

                        <div className="col-span-1 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveMapping(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveMapping(index, 'down')}
                            disabled={index === workingMappings.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          {!mapping.required && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMapping(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Les champs "Marque", "Model" et "Pieces" sont obligatoires pour créer le nom du produit.
                    L'ordre des colonnes ici détermine l'ordre attendu dans votre fichier.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSaveConfiguration} disabled={!newConfigName.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingConfig ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {configurations.map((config) => (
          <Card key={config.id} className={config.is_default ? 'border-primary' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      {config.name}
                      {config.is_default && (
                        <Badge variant="default" className="text-xs">Par défaut</Badge>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {config.column_mappings.length} colonnes configurées
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!config.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(config)}
                    >
                      Définir par défaut
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditConfigDialog(config)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!config.is_default && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer la configuration</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer la configuration "{config.name}" ? 
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteConfiguration(config.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {config.column_mappings.map((mapping, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {mapping.column_name}
                    {mapping.required && ' *'}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}