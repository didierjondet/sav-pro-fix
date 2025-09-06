import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Eye, FileVideo, FileImage } from 'lucide-react';

interface CarouselFileUploadProps {
  fileUrl?: string;
  onFileChange: (fileUrl: string | null) => void;
  mediaType: 'image' | 'video';
  disabled?: boolean;
}

export function CarouselFileUpload({ 
  fileUrl, 
  onFileChange, 
  mediaType,
  disabled = false 
}: CarouselFileUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation du type de fichier
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (mediaType === 'image' && !isImage) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier image (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    if (mediaType === 'video' && !isVideo) {
      toast({
        title: "Erreur", 
        description: "Veuillez sélectionner un fichier vidéo (MP4, WebM, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validation de la taille (max 10MB pour images, 50MB pour vidéos)
    const maxSize = mediaType === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = mediaType === 'image' ? '10MB' : '50MB';
      toast({
        title: "Erreur",
        description: `Le fichier est trop volumineux. Taille maximum: ${maxSizeMB}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Supprimer l'ancien fichier s'il existe
      if (fileUrl) {
        await removeFile();
      }

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `carousel/${fileName}`;

      // Upload du fichier
      const { error: uploadError } = await supabase.storage
        .from('carousel-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('carousel-media')
        .getPublicUrl(filePath);

      onFileChange(publicUrl);
      
      toast({
        title: "Succès",
        description: `${mediaType === 'image' ? 'Image' : 'Vidéo'} uploadée avec succès`,
      });

    } catch (error: any) {
      console.error('Erreur upload:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'upload du fichier",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset input
      event.target.value = '';
    }
  };

  const removeFile = async () => {
    if (!fileUrl) return;

    try {
      // Extraire le chemin du fichier depuis l'URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const filePath = `carousel/${fileName}`;

      const { error } = await supabase.storage
        .from('carousel-media')
        .remove([filePath]);

      if (error) {
        console.error('Erreur suppression fichier:', error);
      }

      onFileChange(null);
      
      toast({
        title: "Succès",
        description: "Fichier supprimé avec succès",
      });

    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast({
        title: "Erreur",  
        description: "Erreur lors de la suppression du fichier",
        variant: "destructive",
      });
    }
  };

  const viewFile = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  if (fileUrl && !uploading) {
    return (
      <Card className="border-2 border-dashed border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              {mediaType === 'video' ? (
                <FileVideo className="h-5 w-5 text-blue-600" />
              ) : (
                <FileImage className="h-5 w-5 text-green-600" />
              )}
              <span className="text-sm font-medium">
                {mediaType === 'video' ? 'Vidéo' : 'Image'} uploadée
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={viewFile}
                disabled={disabled}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeFile}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        {uploading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-center">
                Upload en cours...
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <div className="text-xs text-center text-gray-500">
                {Math.round(uploadProgress)}%
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              {mediaType === 'video' ? (
                <FileVideo className="h-12 w-12 text-blue-400" />
              ) : (
                <FileImage className="h-12 w-12 text-green-400" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {mediaType === 'video' ? 'Télécharger une vidéo' : 'Télécharger une image'}
              </p>
              <p className="text-xs text-gray-500">
                {mediaType === 'video' 
                  ? 'MP4, WebM, AVI (Max: 50MB)' 
                  : 'JPG, PNG, GIF, WebP (Max: 10MB)'
                }
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => document.getElementById('carousel-file-input')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choisir un fichier
            </Button>
            <input
              id="carousel-file-input"
              type="file"
              accept={mediaType === 'video' ? 'video/*' : 'image/*'}
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}