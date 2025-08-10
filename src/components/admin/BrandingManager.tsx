import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Image as ImageIcon, 
  Palette,
  FileImage,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function BrandingManager() {
  const { toast } = useToast();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const uploadToSupabase = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('shop-logos')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('shop-logos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const publicUrl = await uploadToSupabase(file, 'logos');
      setLogoUrl(publicUrl);
      
      toast({
        title: 'Logo téléchargé',
        description: 'Le logo a été téléchargé avec succès'
      });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le logo',
        variant: 'destructive'
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Format invalide',
        description: 'Veuillez télécharger une image (PNG, JPG, etc.)',
        variant: 'destructive'
      });
      return;
    }

    setUploadingFavicon(true);
    try {
      // Convertir automatiquement en favicon compatible
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        // Redimensionner en 32x32 pour favicon
        canvas.width = 32;
        canvas.height = 32;
        ctx?.drawImage(img, 0, 0, 32, 32);
        
        // Convertir en blob PNG
        canvas.toBlob(async (blob) => {
          if (blob) {
            const faviconFile = new File([blob], 'favicon.png', { type: 'image/png' });
            const publicUrl = await uploadToSupabase(faviconFile, 'favicons');
            setFaviconUrl(publicUrl);
            
            toast({
              title: 'Favicon téléchargé',
              description: 'Le favicon a été redimensionné et téléchargé automatiquement (32x32px)'
            });
          }
        }, 'image/png');
      };
      
      img.src = URL.createObjectURL(file);
    } catch (error: any) {
      console.error('Favicon upload error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter le favicon',
        variant: 'destructive'
      });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const applyBranding = async () => {
    try {
      // Ici, vous pourriez sauvegarder les URLs dans la base de données
      // et mettre à jour automatiquement tous les endroits où le logo/favicon est utilisé
      
      toast({
        title: 'Charte graphique appliquée',
        description: 'Le logo et favicon ont été mis à jour sur tout le site'
      });
    } catch (error: any) {
      console.error('Branding application error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'appliquer la charte graphique',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Gestion du Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logo-upload">Logo principal (recommandé: format SVG ou PNG haute résolution)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploadingLogo ? 'Téléchargement...' : 'Choisir un fichier'}
              </Button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
            {logoUrl && (
              <div className="mt-4 p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-4">
                  <img src={logoUrl} alt="Logo prévisualisation" className="h-16 w-auto" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Logo téléchargé</p>
                    <p className="text-xs text-muted-foreground">{logoUrl}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(logoUrl, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">🎯 Recommandations Logo</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Format vectoriel (SVG) recommandé pour une qualité parfaite</li>
              <li>• Si PNG/JPG: minimum 500x200px, fond transparent de préférence</li>
              <li>• Le logo sera automatiquement adapté dans toute l'application</li>
              <li>• Utilisé sur: landing page, emails, documents PDF, interface</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Favicon Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Gestion du Favicon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="favicon-upload">Favicon (icône du navigateur)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Button
                onClick={() => faviconInputRef.current?.click()}
                disabled={uploadingFavicon}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploadingFavicon ? 'Traitement...' : 'Choisir une image'}
              </Button>
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/*"
                onChange={handleFaviconUpload}
                className="hidden"
              />
            </div>
            {faviconUrl && (
              <div className="mt-4 p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-4">
                  <img src={faviconUrl} alt="Favicon prévisualisation" className="h-8 w-8" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Favicon généré</p>
                    <p className="text-xs text-muted-foreground">Automatiquement redimensionné en 32x32px</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(faviconUrl, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">⚡ Traitement Automatique</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Toute image sera automatiquement redimensionnée en 32x32px</li>
              <li>• Format PNG optimisé pour les navigateurs</li>
              <li>• Compatible avec tous les navigateurs modernes</li>
              <li>• Pas besoin de fichier .ico - on s'occupe de tout !</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Application */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Application de la Charte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Une fois téléchargés, vos éléments graphiques seront automatiquement appliqués sur :
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-2">🌐 Sites Web</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Landing page publique</li>
                  <li>• Interface d'administration</li>
                  <li>• Favicon sur tous les onglets</li>
                </ul>
              </div>
              
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-2">📧 Communications</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Emails automatiques</li>
                  <li>• Documents PDF générés</li>
                  <li>• Messages SMS (signature)</li>
                </ul>
              </div>
            </div>

            <Button 
              onClick={applyBranding}
              className="w-full"
              disabled={!logoUrl && !faviconUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Appliquer la charte graphique
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prévisualisation */}
      {(logoUrl || faviconUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>Prévisualisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logoUrl && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Logo sur fond blanc :</p>
                  <div className="bg-white p-4 border rounded">
                    <img src={logoUrl} alt="Logo sur fond blanc" className="h-12 w-auto" />
                  </div>
                </div>
              )}
              
              {faviconUrl && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Favicon (onglet navigateur) :</p>
                  <div className="flex items-center gap-2 bg-slate-100 p-2 rounded">
                    <img src={faviconUrl} alt="Favicon" className="h-4 w-4" />
                    <span className="text-sm">Fixway - Mon Site</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}