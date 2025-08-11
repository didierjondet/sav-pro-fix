import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Image, X, Eye, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

interface PartPhotoUploadProps {
  photoUrl?: string;
  onPhotoChange: (photoUrl: string | null) => void;
  partName?: string;
  disabled?: boolean;
}

export function PartPhotoUpload({ photoUrl, onPhotoChange, partName = "pièce", disabled = false }: PartPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { profile } = useProfile();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.shop_id) return;

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non supporté",
        description: "Seuls les fichiers JPG, PNG et WebP sont acceptés",
        variant: "destructive",
      });
      return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La photo ne doit pas dépasser 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Supprimer l'ancienne photo si elle existe
      if (photoUrl) {
        await supabase.storage.from('part-photos').remove([photoUrl]);
      }

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${profile.shop_id}/part_${timestamp}_${randomString}.${fileExtension}`;

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('part-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      onPhotoChange(data.path);
      toast({
        title: "Photo uploadée",
        description: "La photo de la pièce a été ajoutée avec succès",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader la photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = async () => {
    if (!photoUrl) return;

    try {
      await supabase.storage.from('part-photos').remove([photoUrl]);
      onPhotoChange(null);
      toast({
        title: "Photo supprimée",
        description: "La photo a été supprimée avec succès",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la photo",
        variant: "destructive",
      });
    }
  };

  const viewPhoto = async () => {
    if (!photoUrl) return;

    try {
      const { data: { signedUrl }, error } = await supabase.storage
        .from('part-photos')
        .createSignedUrl(photoUrl, 3600); // 1 heure

      if (error) throw error;

      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('View error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'afficher la photo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <Label>Photo de la pièce</Label>
      
      {photoUrl ? (
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium">Photo ajoutée</div>
                  <div className="text-sm text-muted-foreground">
                    Photo de {partName}
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Camera className="h-3 w-3" />
                  Photo
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={viewPhoto}
                  title="Voir la photo"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removePhoto}
                  disabled={disabled}
                  className="text-destructive hover:text-destructive/80"
                  title="Supprimer la photo"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <Camera className="h-6 w-6 text-muted-foreground" />
              <div className="text-sm text-muted-foreground text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || disabled}
                  className="p-0 h-auto font-normal text-primary hover:text-primary/80"
                >
                  {uploading ? 'Upload en cours...' : 'Cliquez pour ajouter'}
                </Button>
                <div>une photo de la pièce (max 2MB)</div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}