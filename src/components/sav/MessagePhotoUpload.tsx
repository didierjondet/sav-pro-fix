import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, X, Eye, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessagePhoto {
  name: string;
  url: string;
  size: number;
}

interface MessagePhotoUploadProps {
  photos: MessagePhoto[];
  onPhotosChange: (photos: MessagePhoto[]) => void;
  disabled?: boolean;
  maxPhotos?: number;
}

export function MessagePhotoUpload({ 
  photos, 
  onPhotosChange, 
  disabled = false, 
  maxPhotos = 3 
}: MessagePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    const totalPhotos = photos.length + selectedFiles.length;

    if (totalPhotos > maxPhotos) {
      toast({
        title: "Limite atteinte",
        description: `Vous ne pouvez ajouter que ${maxPhotos} photos maximum par message`,
        variant: "destructive",
      });
      return;
    }

    // Vérifier les types et tailles
    const validFiles = selectedFiles.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Type de fichier non supporté",
          description: `${file.name} n'est pas une image valide`,
          variant: "destructive",
        });
        return false;
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse la limite de 5MB`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `message_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('sav-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        return {
          name: file.name,
          url: data.path,
          size: file.size
        };
      });

      const uploadedPhotos = await Promise.all(uploadPromises);
      onPhotosChange([...photos, ...uploadedPhotos]);

      toast({
        title: "Photos ajoutées",
        description: `${uploadedPhotos.length} photo(s) ajoutée(s) avec succès`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader les photos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    try {
      // Supprimer du storage
      await supabase.storage
        .from('sav-attachments')
        .remove([photoUrl]);

      // Mettre à jour la liste
      onPhotosChange(photos.filter(photo => photo.url !== photoUrl));
      
      toast({
        title: "Photo supprimée",
        description: "La photo a été supprimée",
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la photo",
        variant: "destructive",
      });
    }
  };

  const handlePreviewPhoto = async (photoUrl: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('sav-attachments')
        .createSignedUrl(photoUrl, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error previewing photo:', error);
      toast({
        title: "Erreur",
        description: "Impossible de prévisualiser la photo",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Bouton d'ajout */}
      {photos.length < maxPhotos && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="w-full"
        >
          <Camera className="h-4 w-4 mr-2" />
          {uploading ? 'Upload en cours...' : `Ajouter une photo (${photos.length}/${maxPhotos})`}
        </Button>
      )}

      {/* Liste des photos */}
      {photos.length > 0 && (
        <div className="space-y-2">
          {photos.map((photo) => (
            <div key={photo.url} className="flex items-center justify-between p-2 bg-muted rounded-lg">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Camera className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{photo.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(photo.size)}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">Photo</Badge>
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreviewPhoto(photo.url)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePhoto(photo.url)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}