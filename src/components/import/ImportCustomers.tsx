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
import * as XLSX from 'xlsx';
import { Upload, AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';

interface ImportCustomersProps {
  onBack: () => void;
  onSuccess: () => void;
}

interface ImportedCustomer {
  id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  shop_id?: string;
  created_at?: string;
  updated_at?: string;
}

export function ImportCustomers({ onBack, onSuccess }: ImportCustomersProps) {
  const { shop } = useShop();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportedCustomer[]>([]);
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
      const validatedCustomers = validateAndTransformCustomers(data);
      
      setImportData(validatedCustomers);
      setProgress(100);
      setIsProcessing(false);

      if (validatedCustomers.length === 0) {
        setErrors(['Aucun client valide trouvé dans le fichier.']);
      }

    } catch (error) {
      console.error('Erreur lors du parsing:', error);
      setErrors([error instanceof Error ? error.message : 'Erreur lors de la lecture du fichier']);
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const validateAndTransformCustomers = (rawData: any[]): ImportedCustomer[] => {
    const customers: ImportedCustomer[] = [];
    const newErrors: string[] = [];

    rawData.forEach((row, index) => {
      const lineNumber = index + 2; // +2 car index commence à 0 et on skip la ligne d'en-tête

      // Validation des champs obligatoires
      const firstName = row.first_name || row.prenom || row.prénom || row.nom || '';
      const lastName = row.last_name || row.nom_famille || row.nom_de_famille || row.surname || '';

      if (!firstName && !lastName) {
        newErrors.push(`Ligne ${lineNumber}: Nom et prénom manquants`);
        return;
      }

      // Construction de l'objet client
      const customer: ImportedCustomer = {
        first_name: firstName || 'Client',
        last_name: lastName || 'Import',
        email: row.email || row.mail || row.e_mail || null,
        phone: row.phone || row.telephone || row.tel || row.mobile || null,
        address: row.address || row.adresse || row.addr || null,
        shop_id: shop?.id
      };

      customers.push(customer);
    });

    setErrors(newErrors);
    return customers;
  };

  const handleImportStart = () => {
    setShowConfirmation(true);
    setConfirmationStep('warning');
  };

  const executeImport = async () => {
    try {
      setIsProcessing(true);
      setProgress(0);

      if (!shop?.id) {
        throw new Error('Shop ID manquant');
      }

      // Supprimer tous les clients existants du magasin
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('shop_id', shop.id);

      if (deleteError) {
        throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
      }

      setProgress(30);

      // Insérer les nouveaux clients par lots
      const batchSize = 100;
      for (let i = 0; i < importData.length; i += batchSize) {
        const batch = importData.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('customers')
          .insert(batch);

        if (insertError) {
          throw new Error(`Erreur lors de l'insertion (lot ${Math.floor(i/batchSize) + 1}): ${insertError.message}`);
        }

        setProgress(30 + (70 * (i + batch.length)) / importData.length);
      }

      setProgress(100);
      setIsProcessing(false);
      
      toast({
        title: "Import terminé",
        description: `${importData.length} clients importés avec succès.`
      });

      onSuccess();
      
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      setIsProcessing(false);
      toast({
        title: "Erreur d'import",
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: "destructive"
      });
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportData([]);
    setErrors([]);
    setProgress(0);
    setShowConfirmation(false);
    setConfirmationStep('warning');
    setCountdown(10);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Interface de confirmation
  if (showConfirmation) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirmation d'import - Clients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {confirmationStep === 'warning' && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>ATTENTION :</strong> Cette action va supprimer TOUS les clients existants 
                  de votre magasin et les remplacer par les {importData.length} clients du fichier.
                  Cette action est <strong>irréversible</strong>.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setConfirmationStep('countdown')}
                >
                  Je comprends, continuer
                </Button>
              </div>
            </>
          )}

          {confirmationStep === 'countdown' && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  L'import commencera dans <strong>{countdown}</strong> secondes.
                  Dernière chance pour annuler !
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </>
          )}

          {confirmationStep === 'final' && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Prêt à importer {importData.length} clients et supprimer tous les clients existants.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={executeImport}
                  disabled={isProcessing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Import en cours...' : 'Confirmer l\'import'}
                </Button>
              </div>
              
              {isProcessing && (
                <Progress value={progress} className="mt-4" />
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Interface principale d'import
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import des clients
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux paramètres
        </Button>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Fichier CSV ou Excel</Label>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Formats acceptés : CSV (séparateur ;) et Excel (.xlsx, .xls)
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Colonnes attendues :</strong>
              <br />• <code>first_name</code> ou <code>prenom</code> (obligatoire)
              <br />• <code>last_name</code> ou <code>nom</code> (obligatoire)  
              <br />• <code>email</code> ou <code>mail</code> (optionnel)
              <br />• <code>phone</code> ou <code>telephone</code> (optionnel)
              <br />• <code>address</code> ou <code>adresse</code> (optionnel)
            </AlertDescription>
          </Alert>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Traitement en cours...</p>
            <Progress value={progress} />
          </div>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erreurs détectées :</strong>
              <ul className="mt-2 space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">• {error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {importData.length > 0 && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>{importData.length} clients</strong> prêts à être importés.
                Aperçu des 5 premiers :
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">Prénom</th>
                    <th className="p-3 text-left">Nom</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Téléphone</th>
                    <th className="p-3 text-left">Adresse</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.slice(0, 5).map((customer, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-3">{customer.first_name}</td>
                      <td className="p-3">{customer.last_name}</td>
                      <td className="p-3">{customer.email || '-'}</td>
                      <td className="p-3">{customer.phone || '-'}</td>
                      <td className="p-3 truncate max-w-xs">{customer.address || '-'}</td>
                    </tr>
                  ))}
                  {importData.length > 5 && (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-muted-foreground">
                        ... et {importData.length - 5} autres clients
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImportStart} variant="destructive">
                <Upload className="h-4 w-4 mr-2" />
                Importer les clients
              </Button>
              <Button variant="outline" onClick={resetImport}>
                Recommencer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}