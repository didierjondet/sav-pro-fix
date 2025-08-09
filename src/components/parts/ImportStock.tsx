import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, Settings } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useImportConfigurations, type ColumnMapping, type ImportConfiguration } from '@/hooks/useImportConfigurations';
import { ImportConfigurationManager } from '@/components/parts/ImportConfigurationManager';

interface ImportedPart {
  marque: string;
  model: string;
  pieces: string;
  fournisseur?: string;
  prix_public?: number;
  prix_achat_ht?: number;
  prix_ttc?: number;
  temp_rep_min?: number;
  // Mapped fields
  name: string;
  reference: string;
  selling_price: number;
  purchase_price: number;
  quantity: number;
  min_stock: number;
}

interface ImportStatsProps {
  onBack: () => void;
  onRefresh: () => void;
}

export function ImportStock({ onBack, onRefresh }: ImportStatsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportedPart[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<number>(0);
  const [showConfigManager, setShowConfigManager] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ImportConfiguration | null>(null);
  const { toast } = useToast();
  const { configurations, getDefaultConfiguration } = useImportConfigurations();

  // Use selected configuration or default
  const currentConfig = selectedConfig || getDefaultConfiguration();
  const expectedColumns = currentConfig?.column_mappings.map(m => m.column_name) || [];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportData([]);
      setErrors([]);
      setSuccess(0);
    }
  };

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`Erreur CSV: ${results.errors[0].message}`));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => reject(error)
      });
    });
  };

  const parseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsArrayBuffer(file);
    });
  };

  const normalizeColumnName = (name: string): string => {
    return name.trim().toLowerCase().replace(/\s+/g, '_');
  };

  const mapRowToImportedPart = (row: any): ImportedPart | null => {
    try {
      if (!currentConfig) return null;

      // Normalize column names for flexible matching
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = normalizeColumnName(key);
        normalizedRow[normalizedKey] = row[key];
      });

      // Map values based on configuration
      const mappedValues: any = {};
      for (const mapping of currentConfig.column_mappings) {
        const normalizedColumnName = normalizeColumnName(mapping.column_name);
        let value = normalizedRow[normalizedColumnName];

        // Apply default if value is empty
        if (!value && mapping.default !== undefined) {
          value = mapping.default;
        }

        // Convert types
        if (mapping.type === 'number' && value !== undefined) {
          value = parseFloat(value) || (mapping.default as number) || 0;
        }

        mappedValues[mapping.field_name] = value;
      }

      // Validate required fields
      const requiredFields = currentConfig.column_mappings.filter(m => m.required);
      for (const field of requiredFields) {
        if (!mappedValues[field.field_name]) {
          return null;
        }
      }

      // Create name from marque + model + pieces
      const name = `${mappedValues.marque || ''} ${mappedValues.model || ''} - ${mappedValues.pieces || ''}`.trim();
      
      // Create reference from marque + model
      const reference = `${mappedValues.marque || ''}-${mappedValues.model || ''}`.replace(/\s+/g, '-').toUpperCase();

      const importedPart: ImportedPart = {
        marque: mappedValues.marque || '',
        model: mappedValues.model || '',
        pieces: mappedValues.pieces || '',
        fournisseur: mappedValues.fournisseur || '',
        prix_public: mappedValues.selling_price || 0,
        prix_achat_ht: mappedValues.purchase_price || 0,
        prix_ttc: mappedValues.prix_ttc || 0,
        temp_rep_min: mappedValues.temp_rep_min || 0,
        // Mapped fields for parts table
        name,
        reference,
        selling_price: mappedValues.selling_price || 0,
        purchase_price: mappedValues.purchase_price || 0,
        quantity: mappedValues.quantity || 0,
        min_stock: mappedValues.min_stock || 5,
      };

      return importedPart;
    } catch (error) {
      return null;
    }
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setErrors([]);

    try {
      let rawData: any[];
      
      if (file.name.endsWith('.csv')) {
        rawData = await parseCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        rawData = await parseExcel(file);
      } else {
        throw new Error('Format de fichier non supporté. Utilisez CSV ou Excel.');
      }

      setProgress(25);

      const processedData: ImportedPart[] = [];
      const processingErrors: string[] = [];

      rawData.forEach((row, index) => {
        const importedPart = mapRowToImportedPart(row);
        if (importedPart) {
          processedData.push(importedPart);
        } else {
          processingErrors.push(`Ligne ${index + 2}: Données invalides ou incomplètes`);
        }
      });

      setProgress(50);
      setImportData(processedData);
      setErrors(processingErrors);

      if (processedData.length === 0) {
        throw new Error('Aucune donnée valide trouvée dans le fichier');
      }

      toast({
        title: "Fichier traité",
        description: `${processedData.length} articles trouvés, ${processingErrors.length} erreurs`,
      });

    } catch (error: any) {
      setErrors([error.message]);
      toast({
        title: "Erreur de traitement",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const importToDatabase = async () => {
    if (importData.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setErrors([]);
    setSuccess(0);

    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop non trouvé pour cet utilisateur');
      }

      const batchSize = 10;
      let imported = 0;
      const importErrors: string[] = [];

      for (let i = 0; i < importData.length; i += batchSize) {
        const batch = importData.slice(i, i + batchSize);
        
        const partsToInsert = batch.map(item => ({
          name: item.name,
          reference: item.reference,
          selling_price: item.selling_price,
          purchase_price: item.purchase_price,
          quantity: item.quantity,
          min_stock: item.min_stock,
          shop_id: profile.shop_id
        }));

        try {
          const { data, error } = await supabase
            .from('parts')
            .insert(partsToInsert)
            .select();

          if (error) {
            // Try to insert individually to identify problematic records
            for (const part of partsToInsert) {
              try {
                await supabase.from('parts').insert([part]);
                imported++;
              } catch (individualError: any) {
                importErrors.push(`${part.name}: ${individualError.message}`);
              }
            }
          } else {
            imported += data.length;
          }
        } catch (batchError: any) {
          importErrors.push(`Lot ${Math.floor(i/batchSize) + 1}: ${batchError.message}`);
        }

        setProgress(Math.round(((i + batchSize) / importData.length) * 100));
        setSuccess(imported);
      }

      setErrors(importErrors);

      toast({
        title: "Import terminé",
        description: `${imported} articles importés avec succès`,
      });

      if (imported > 0) {
        onRefresh();
      }

    } catch (error: any) {
      setErrors([error.message]);
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {showConfigManager ? (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => setShowConfigManager(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'import
            </Button>
            <h1 className="text-2xl font-bold">Gestion des configurations d'import</h1>
          </div>
          <ImportConfigurationManager 
            onConfigurationChange={(config) => {
              setSelectedConfig(config);
              setShowConfigManager(false);
            }}
          />
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Import de stock CSV/Excel</h1>
            <Button variant="outline" onClick={() => setShowConfigManager(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configurations
            </Button>
          </div>

          <div className="space-y-6">
            {/* Configuration Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration d'import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="config-select">Choisir une configuration</Label>
                  <Select
                    value={currentConfig?.id || ''}
                    onValueChange={(value) => {
                      const config = configurations.find(c => c.id === value);
                      setSelectedConfig(config || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      {configurations.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.name} {config.is_default && '(par défaut)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {currentConfig && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Colonnes attendues dans votre fichier :
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {currentConfig.column_mappings.map((mapping) => (
                        <Badge key={mapping.field_name} variant={mapping.required ? "default" : "outline"}>
                          {mapping.column_name}
                          {mapping.required && ' *'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Format de fichier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {currentConfig 
                      ? `Configuration active : ${currentConfig.name}. Les colonnes marquées d'un * sont obligatoires.`
                      : 'Aucune configuration sélectionnée. Veuillez en choisir une ou en créer une nouvelle.'
                    }
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Sélectionner le fichier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="file">Fichier CSV ou Excel</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                  />
                </div>

                {file && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button onClick={processFile} disabled={isProcessing || !currentConfig}>
                      <Upload className="h-4 w-4 mr-2" />
                      Traiter le fichier
                    </Button>
                  </div>
                )}

                {!currentConfig && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Veuillez sélectionner une configuration d'import avant de traiter le fichier.
                    </AlertDescription>
                  </Alert>
                )}

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-muted-foreground">
                      Traitement en cours... {progress}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview */}
            {importData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Aperçu des données ({importData.length} articles)</span>
                    <Button 
                      onClick={importToDatabase} 
                      disabled={isProcessing}
                      className="ml-4"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Importer en base
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {importData.slice(0, 10).map((item, index) => (
                        <div key={index} className="border rounded p-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Réf: {item.reference} | 
                            Quantité: {item.quantity} | 
                            Achat: {item.purchase_price}€ | 
                            Vente: {item.selling_price}€
                          </div>
                        </div>
                      ))}
                      {importData.length > 10 && (
                        <div className="text-center text-sm text-muted-foreground py-2">
                          ... et {importData.length - 10} autres articles
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {success > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{success} articles importés avec succès !</strong>
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">
                    Erreurs ({errors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {errors.map((error, index) => (
                      <div key={index} className="text-sm text-destructive">
                        • {error}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}