import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ImportedPart {
  marque: string;
  model: string;
  pieces: string;
  fournisseur?: string;
  prix_public?: number;
  prix_achat_ht?: number;
  prix_ttc?: number;
  date_prix?: string;
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
  const { toast } = useToast();

  const expectedColumns = [
    'Marque', 'Model', 'Pieces', 'Fournisseur', 
    'Prix public', 'Prix achat ht', 'Prix ttc', 
    'DATE PRIX', 'Temp rep (min)'
  ];

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
      // Normalize column names for flexible matching
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = normalizeColumnName(key);
        normalizedRow[normalizedKey] = row[key];
      });

      const marque = normalizedRow['marque'] || '';
      const model = normalizedRow['model'] || '';
      const pieces = normalizedRow['pieces'] || '';

      if (!marque || !model || !pieces) {
        return null;
      }

      // Create name from marque + model + pieces
      const name = `${marque} ${model} - ${pieces}`.trim();
      
      // Create reference from marque + model
      const reference = `${marque}-${model}`.replace(/\s+/g, '-').toUpperCase();

      const importedPart: ImportedPart = {
        marque,
        model,
        pieces,
        fournisseur: normalizedRow['fournisseur'] || '',
        prix_public: parseFloat(normalizedRow['prix_public']) || 0,
        prix_achat_ht: parseFloat(normalizedRow['prix_achat_ht']) || 0,
        prix_ttc: parseFloat(normalizedRow['prix_ttc']) || 0,
        date_prix: normalizedRow['date_prix'] || '',
        temp_rep_min: parseInt(normalizedRow['temp_rep_(min)'] || normalizedRow['temp_rep_min']) || 0,
        // Mapped fields for parts table
        name,
        reference,
        selling_price: parseFloat(normalizedRow['prix_public']) || 0,
        purchase_price: parseFloat(normalizedRow['prix_achat_ht']) || 0,
        quantity: 0, // Default quantity
        min_stock: 5, // Default min stock
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">Import de stock CSV/Excel</h1>
      </div>

      <div className="space-y-6">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Format de fichier attendu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Votre fichier CSV ou Excel doit contenir les colonnes suivantes :
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {expectedColumns.map((col) => (
                <Badge key={col} variant="outline">{col}</Badge>
              ))}
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Les colonnes "Marque", "Model" et "Pieces" sont obligatoires. 
                Le nom final sera généré comme : "Marque Model - Pieces"
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
                <Button onClick={processFile} disabled={isProcessing}>
                  <Upload className="h-4 w-4 mr-2" />
                  Traiter le fichier
                </Button>
              </div>
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
  );
}