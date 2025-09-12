import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import * as XLSX from 'xlsx';
import { Upload, AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';

interface ImportSAVsProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface ImportedSAV {
  id?: string;
  case_number: string;
  created_at?: string;
  updated_at?: string;
  sav_type: string; // Changé vers string pour supporter les types dynamiques
  status: 'pending' | 'in_progress' | 'testing' | 'ready' | 'delivered' | 'cancelled' | 'parts_ordered' | 'parts_received';
  total_cost: number;
  total_time_minutes: number;
  device_brand: string;
  device_model: string;
  device_imei?: string;
  sku?: string;
  problem_description?: string;
  repair_notes?: string;
  private_comments?: string;
  taken_over: boolean;
  partial_takeover: boolean;
  takeover_amount: number;
  tracking_slug?: string;
  shop_id?: string;
  customer_id?: string;
  technician_id?: string;
  accessories?: any;
  attachments?: any;
}

export function ImportSAVs({ onBack, onSuccess }: ImportSAVsProps) {
  const { shop } = useShop();
  const { getAllTypes } = useShopSAVTypes();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportedSAV[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<'warning' | 'countdown' | 'final'>('warning');
  const [countdown, setCountdown] = useState(10);
  const [errors, setErrors] = useState<string[]>([]);

  // Timer pour le countdown
  useEffect(() => {
    if (confirmationStep === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (confirmationStep === 'countdown' && countdown === 0) {
      setConfirmationStep('final');
    }
  }, [confirmationStep, countdown]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrors([]);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (selectedFile: File) => {
    try {
      setIsProcessing(true);
      setProgress(10);

      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      let data: any[] = [];

      if (extension === 'csv') {
        const text = await selectedFile.text();
        const lines = text.split('\n');
        const headers = lines[0].split(';').map(h => h.replace(/"/g, '').trim());
        
        data = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(';').map(v => v.replace(/"/g, '').trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
      } else if (extension === 'xlsx') {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      } else {
        throw new Error('Format de fichier non supporté. Utilisez CSV ou Excel.');
      }

      setProgress(50);

      // Validation et transformation des données
      const validatedSAVs = await validateAndTransformSAVs(data);
      setImportData(validatedSAVs);
      setProgress(100);

      toast({
        title: "Fichier analysé",
        description: `${validatedSAVs.length} dossiers SAV prêts à être importés`,
      });

    } catch (error: any) {
      setErrors([error.message]);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validateAndTransformSAVs = async (data: any[]): Promise<ImportedSAV[]> => {
    const savs: ImportedSAV[] = [];
    const newErrors: string[] = [];
    const availableTypes = getAllTypes();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Validation des champs obligatoires
        if (!row['Dossier']) {
          newErrors.push(`Ligne ${i + 2}: Numéro de dossier manquant`);
          continue;
        }

        if (!row['Marque'] || !row['Modèle']) {
          newErrors.push(`Ligne ${i + 2}: Marque ou modèle de l'appareil manquant`);
          continue;
        }

        // Valider le type SAV avec les types disponibles
        let savType = 'client'; // valeur par défaut
        if (row['Type']) {
          const foundType = availableTypes.find(t => 
            t.value === row['Type'] || 
            t.label.toLowerCase() === row['Type'].toLowerCase()
          );
          if (foundType) {
            savType = foundType.value;
          }
        }

        const sav: ImportedSAV = {
          id: row['ID'] || undefined,
          case_number: row['Dossier'],
          sav_type: savType,
          status: (['pending', 'in_progress', 'testing', 'ready', 'delivered', 'cancelled', 'parts_ordered', 'parts_received'].includes(row['Statut']) ? row['Statut'] : 'pending') as 'pending' | 'in_progress' | 'testing' | 'ready' | 'delivered' | 'cancelled' | 'parts_ordered' | 'parts_received',
          total_cost: parseFloat(row['Coût (€)'] || '0'),
          total_time_minutes: parseInt(row['Temps (min)'] || '0'),
          device_brand: row['Marque'],
          device_model: row['Modèle'],
          device_imei: row['IMEI'] || '',
          sku: row['SKU'] || '',
          problem_description: row['Problème'] || '',
          repair_notes: row['Notes réparation'] || '',
          private_comments: row['Commentaires privés'] || '',
          taken_over: row['Prise en charge'] === 'oui' || row['Prise en charge'] === true,
          partial_takeover: row['Prise partielle'] === 'oui' || row['Prise partielle'] === true,
          takeover_amount: parseFloat(row['Montant prise en charge'] || '0'),
          tracking_slug: row['Tracking'] || '',
          shop_id: shop?.id,
          customer_id: row['Customer ID'] || null,
          technician_id: row['Technicien ID'] || null,
          accessories: { case: false, charger: false, screen_protector: false },
          attachments: []
        };

        savs.push(sav);
      } catch (error: any) {
        newErrors.push(`Ligne ${i + 2}: ${error.message}`);
      }
    }

    setErrors(newErrors);
    return savs;
  };

  const handleImportStart = () => {
    if (importData.length === 0) return;
    setShowConfirmation(true);
    setConfirmationStep('warning');
  };

  const handleConfirmWarning = () => {
    setConfirmationStep('countdown');
    setCountdown(10);
  };

  const executeImport = async () => {
    if (!shop?.id) return;

    try {
      setIsProcessing(true);
      setProgress(0);

      // ÉTAPE 1: Supprimer tous les dossiers SAV existants
      setProgress(10);
      const { error: deleteError } = await supabase
        .from('sav_cases')
        .delete()
        .eq('shop_id', shop.id);

      if (deleteError) throw deleteError;

      setProgress(30);

      // ÉTAPE 2: Insérer les nouveaux dossiers SAV
      const batchSize = 50;
      for (let i = 0; i < importData.length; i += batchSize) {
        const batch = importData.slice(i, i + batchSize).map(sav => {
          const { id, ...savData } = sav; // Enlever l'id pour éviter les conflits
          return {
            ...savData,
            shop_id: shop.id,
            created_at: sav.created_at || new Date().toISOString(),
            updated_at: sav.updated_at || new Date().toISOString()
          };
        });

        const { error: insertError } = await supabase
          .from('sav_cases')
          .insert(batch as any);

        if (insertError) throw insertError;

        setProgress(30 + (i / importData.length) * 60);
      }

      setProgress(100);
      
      toast({
        title: "Import réussi",
        description: `${importData.length} dossiers SAV ont été importés avec succès`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowConfirmation(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportData([]);
    setErrors([]);
    setProgress(0);
    setShowConfirmation(false);
    setConfirmationStep('warning');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (showConfirmation) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            {confirmationStep === 'warning' ? 'ATTENTION - SUPPRESSION TOTALE' :
             confirmationStep === 'countdown' ? 'CONFIRMATION EN COURS' :
             'DERNIÈRE CONFIRMATION'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {confirmationStep === 'warning' && (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>⚠️ DANGER - CETTE ACTION EST IRRÉVERSIBLE ⚠️</strong><br/>
                  Vous êtes sur le point de SUPPRIMER DÉFINITIVEMENT tous vos dossiers SAV existants 
                  et de les remplacer par les {importData.length} dossiers du fichier importé.
                </AlertDescription>
              </Alert>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-semibold text-destructive mb-2">Conséquences :</h4>
                <ul className="text-sm space-y-1 text-destructive">
                  <li>• TOUS vos dossiers SAV actuels seront supprimés</li>
                  <li>• Tous les messages et historiques associés seront perdus</li>
                  <li>• Cette action ne peut PAS être annulée</li>
                  <li>• Assurez-vous d'avoir une sauvegarde complète</li>
                  <li>• Vérifiez que votre fichier contient bien TOUTES les données nécessaires</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Annuler et revenir
                </Button>
                <Button variant="destructive" onClick={handleConfirmWarning} className="flex-1">
                  Je comprends les risques - Continuer
                </Button>
              </div>
            </>
          )}

          {confirmationStep === 'countdown' && (
            <>
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-destructive">{countdown}</div>
                <p className="text-lg">Réflexion en cours... Êtes-vous vraiment sûr ?</p>
                <p className="text-sm text-muted-foreground">
                  Cette période de réflexion vous permet de changer d'avis avant la suppression définitive.
                </p>
              </div>
              
              <Button variant="outline" onClick={() => setShowConfirmation(false)} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Finalement, annuler l'import
              </Button>
            </>
          )}

          {confirmationStep === 'final' && (
            <>
              <Alert variant="destructive">
                <Trash2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>DERNIÈRE CHANCE</strong><br/>
                  Cliquez sur "SUPPRIMER ET IMPORTER" pour procéder à la suppression 
                  définitive et à l'import des {importData.length} nouveaux dossiers SAV.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                  Non, annuler
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={executeImport} 
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? 'Import en cours...' : 'SUPPRIMER ET IMPORTER'}
                </Button>
              </div>
            </>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Import en cours... {Math.round(progress)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h2 className="text-2xl font-bold">Import des Dossiers SAV</h2>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important :</strong> Cette fonction remplacera TOUS vos dossiers SAV existants par ceux du fichier. 
          Tous les messages et historiques associés seront également perdus. Assurez-vous d'avoir une sauvegarde complète avant de procéder.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Sélectionner le fichier d'import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Fichier CSV ou Excel</Label>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Utilisez le même format que les fichiers exportés (CSV avec séparateur ";")
            </p>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Analyse du fichier... {Math.round(progress)}%
              </p>
            </div>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erreurs détectées :</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {errors.slice(0, 10).map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                  {errors.length > 10 && (
                    <li className="text-sm">... et {errors.length - 10} autres erreurs</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {importData.length > 0 && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Aperçu de l'import :</h4>
                <p className="text-sm">
                  <strong>{importData.length}</strong> dossiers SAV prêts à être importés
                </p>
                <p className="text-sm text-muted-foreground">
                  Erreurs : {errors.length}
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetImport}>
                  Recommencer
                </Button>
                <Button 
                  onClick={handleImportStart}
                  disabled={errors.length > 0 || importData.length === 0}
                  variant="destructive"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Démarrer l'import ({importData.length} dossiers SAV)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}