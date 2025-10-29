import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Upload, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { detectOwnExportFormat, createAutoMapping } from "@/utils/importHelpers";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface SimpleImportProps {
  type: 'parts' | 'customers' | 'quotes' | 'savs';
  shopId: string;
  onSuccess: () => void;
  onBack: () => void;
  onAdvancedMode?: () => void;
}

export function SimpleImport({ type, shopId, onSuccess, onBack, onAdvancedMode }: SimpleImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const typeLabels: Record<string, string> = {
    parts: 'Stock (Pièces)',
    customers: 'Clients',
    quotes: 'Devis',
    savs: 'SAV'
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setDetectedFormat(null);
    setPreview([]);

    try {
      const data = await parseFile(selectedFile);
      
      if (data.length === 0) {
        setError("Le fichier est vide");
        return;
      }

      const headers = Object.keys(data[0]);
      const detected = detectOwnExportFormat(headers);
      
      if (detected !== type) {
        setError(`Format non reconnu. Ce fichier semble contenir des données de type "${detected || 'inconnu'}" mais vous essayez d'importer "${typeLabels[type]}".`);
        return;
      }

      setDetectedFormat(detected);
      setPreview(data.slice(0, 5));
      
      toast({
        title: "Format reconnu",
        description: `Le fichier contient ${data.length} ligne(s) de ${typeLabels[type]}.`
      });
    } catch (err) {
      console.error('Erreur lors de la lecture du fichier:', err);
      setError("Erreur lors de la lecture du fichier. Vérifiez le format.");
    }
  };

  const parseFile = async (file: File): Promise<Record<string, any>[]> => {
    return new Promise((resolve, reject) => {
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data as Record<string, any>[]),
          error: (error) => reject(error)
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Record<string, any>[];
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Format de fichier non supporté'));
      }
    });
  };

  const handleImport = async () => {
    if (!file || !detectedFormat) return;

    setImporting(true);
    setProgress(0);
    setError(null);

    try {
      const data = await parseFile(file);
      const headers = Object.keys(data[0]);
      const mapping = createAutoMapping(headers, type);

      const batchSize = 100;
      const totalBatches = Math.ceil(data.length / batchSize);

      // Déterminer le nom de la table
      let tableName: 'parts' | 'customers' | 'quotes' | 'sav_cases';
      if (type === 'parts') tableName = 'parts';
      else if (type === 'customers') tableName = 'customers';
      else if (type === 'quotes') tableName = 'quotes';
      else tableName = 'sav_cases';

      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('shop_id', shopId);

      if (deleteError) throw deleteError;

      for (let i = 0; i < totalBatches; i++) {
        const batch = data.slice(i * batchSize, (i + 1) * batchSize);
        const mappedBatch = batch.map(row => {
          const mappedRow: Record<string, any> = { shop_id: shopId };
          
          for (const [systemField, headerName] of Object.entries(mapping)) {
            const value = row[headerName];
            if (value !== undefined && value !== null && value !== '') {
              mappedRow[systemField] = value;
            }
          }
          
          return mappedRow;
        });

        const { error: insertError } = await supabase
          .from(tableName)
          .insert(mappedBatch as any);

        if (insertError) throw insertError;

        setProgress(((i + 1) / totalBatches) * 100);
      }

      toast({
        title: "Import réussi",
        description: `${data.length} enregistrement(s) importé(s) avec succès.`
      });

      onSuccess();
    } catch (err) {
      console.error('Erreur lors de l\'import:', err);
      setError("Erreur lors de l'import des données.");
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'importer les données."
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <strong>💡 Astuce :</strong> Exportez vos données via le bouton "Exporter Excel", modifiez-les, 
          puis réimportez-les ici. Le format sera automatiquement reconnu !
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Import simplifié - {typeLabels[type]}</CardTitle>
          <CardDescription>
            Sélectionnez un fichier exporté depuis l'application pour un import automatique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={importing}
              className="flex-1"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {onAdvancedMode && (
                  <Button 
                    variant="link" 
                    className="ml-2 p-0 h-auto" 
                    onClick={onAdvancedMode}
                  >
                    Utiliser le mode avancé
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {detectedFormat && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Format reconnu : <strong>{typeLabels[type]}</strong>
              </AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Aperçu (5 premières lignes)</h4>
              <div className="overflow-auto max-h-64 border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {Object.keys(preview[0]).map((key, i) => (
                        <th key={i} className="px-2 py-1 text-left">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-2 py-1">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Import en cours... {Math.round(progress)}%
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} disabled={importing}>
              Annuler
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!detectedFormat || importing}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importer {preview.length > 0 ? `(${preview.length}+ lignes)` : ''}
            </Button>
          </div>

          {onAdvancedMode && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onAdvancedMode}
              className="w-full"
            >
              ⚙️ Mode avancé (autres formats)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
