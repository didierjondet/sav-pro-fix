import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  Package, 
  CheckCircle2, 
  ArrowLeft,
  Loader2,
  FileText,
  FileCode,
  Image
} from 'lucide-react';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';

const EXTENSION_FILES = [
  { name: 'manifest.json', type: 'json', icon: FileCode },
  { name: 'popup.html', type: 'html', icon: FileCode },
  { name: 'popup.js', type: 'js', icon: FileCode },
  { name: 'background.js', type: 'js', icon: FileCode },
  { name: 'content-mobilax.js', type: 'js', icon: FileCode },
  { name: 'content-utopya.js', type: 'js', icon: FileCode },
  { name: 'icon16.png', type: 'image', icon: Image },
  { name: 'icon48.png', type: 'image', icon: Image },
  { name: 'icon128.png', type: 'image', icon: Image },
  { name: 'README.md', type: 'md', icon: FileText },
];

const INSTALLATION_STEPS = [
  'Cliquez sur "Télécharger l\'extension (ZIP)"',
  'Décompressez le fichier ZIP téléchargé',
  'Ouvrez Chrome et allez à chrome://extensions',
  'Activez le "Mode développeur" (bouton en haut à droite)',
  'Cliquez sur "Charger l\'extension non empaquetée"',
  'Sélectionnez le dossier décompressé',
];

export default function ChromeExtensionDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  const downloadZip = async () => {
    setIsDownloading(true);
    setDownloadProgress('Préparation des fichiers...');

    try {
      const zip = new JSZip();
      const folder = zip.folder('sav-parts-search-extension');

      if (!folder) {
        throw new Error('Impossible de créer le dossier ZIP');
      }

      // Download each file and add to ZIP
      for (const file of EXTENSION_FILES) {
        setDownloadProgress(`Chargement de ${file.name}...`);
        
        const response = await fetch(`/chrome-extension/${file.name}`);
        
        if (!response.ok) {
          console.warn(`Fichier non trouvé: ${file.name}`);
          continue;
        }

        if (file.type === 'image') {
          const blob = await response.blob();
          folder.file(file.name, blob);
        } else {
          const text = await response.text();
          folder.file(file.name, text);
        }
      }

      setDownloadProgress('Création du fichier ZIP...');
      
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Download the ZIP file
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sav-parts-search-extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadProgress('Téléchargement terminé !');
      
      setTimeout(() => {
        setDownloadProgress('');
        setIsDownloading(false);
      }, 2000);

    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setDownloadProgress('Erreur lors du téléchargement');
      setIsDownloading(false);
    }
  };

  const downloadSingleFile = async (fileName: string) => {
    const response = await fetch(`/chrome-extension/${fileName}`);
    const blob = await response.blob();
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link to="/parts" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Retour aux pièces
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Extension Chrome - Recherche Pièces</h1>
              <p className="text-muted-foreground">
                Recherchez des pièces chez Mobilax et Utopya directement depuis Chrome
              </p>
            </div>
          </div>
        </div>

        {/* Main Download Card */}
        <Card className="mb-6">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Télécharger l'extension</CardTitle>
            <CardDescription>
              Un seul fichier ZIP contenant tous les fichiers nécessaires
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button 
              size="lg" 
              onClick={downloadZip}
              disabled={isDownloading}
              className="gap-2"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {downloadProgress}
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Télécharger l'extension (ZIP)
                </>
              )}
            </Button>
            
            {downloadProgress === 'Téléchargement terminé !' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>Fichier téléchargé avec succès !</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Installation Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">📋 Instructions d'installation</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {INSTALLATION_STEPS.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>💡 Astuce :</strong> Une fois installée, l'extension apparaîtra dans votre barre d'outils Chrome. 
                Cliquez dessus pour rechercher des pièces en utilisant votre session connectée sur les sites fournisseurs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Individual Files */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📁 Fichiers individuels</CardTitle>
            <CardDescription>
              Si vous avez besoin de télécharger les fichiers un par un
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {EXTENSION_FILES.map((file) => {
                const IconComponent = file.icon;
                return (
                  <Button
                    key={file.name}
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSingleFile(file.name)}
                    className="justify-start gap-2"
                  >
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{file.name}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
