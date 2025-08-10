import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, File, X, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

interface FileUploadProps {
  files: string[];
  onFilesChange: (files: string[]) => void;
  partId: string;
  label?: string;
}

export function FileUpload({ files, onFilesChange, partId, label = "Joindre des fichiers" }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { profile } = useProfile();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || !profile?.shop_id) return;

    setUploading(true);
    const newFileUrls: string[] = [];

    try {
      for (const file of Array.from(selectedFiles)) {
        // Vérifier le type de fichier
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: "Type de fichier non supporté",
            description: `Le fichier ${file.name} n'est pas supporté. Formats acceptés: JPG, PNG, WebP, PDF`,
            variant: "destructive",
          });
          continue;
        }

        // Vérifier la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Fichier trop volumineux",
            description: `Le fichier ${file.name} dépasse 5MB.`,
            variant: "destructive",
          });
          continue;
        }

        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop();
        const fileName = `${partId}_${timestamp}_${randomString}.${fileExtension}`;
        const filePath = `${profile.shop_id}/${fileName}`;

        // Upload vers Supabase Storage
        const { data, error } = await supabase.storage
          .from('part-attachments')
          .upload(filePath, file);

        if (error) {
          console.error('Erreur upload:', error);
          toast({
            title: "Erreur d'upload",
            description: `Impossible d'uploader ${file.name}`,
            variant: "destructive",
          });
          continue;
        }

        newFileUrls.push(data.path);
      }

      if (newFileUrls.length > 0) {
        onFilesChange([...files, ...newFileUrls]);
        toast({
          title: "Fichiers uploadés",
          description: `${newFileUrls.length} fichier(s) ajouté(s) avec succès.`,
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'upload des fichiers.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = async (filePath: string) => {
    try {
      // Supprimer de Supabase Storage
      const { error } = await supabase.storage
        .from('part-attachments')
        .remove([filePath]);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
      }

      // Retirer de la liste locale
      onFilesChange(files.filter(f => f !== filePath));
      
      toast({
        title: "Fichier supprimé",
        description: "Le fichier a été supprimé avec succès.",
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fichier.",
        variant: "destructive",
      });
    }
  };

  const getFileName = (filePath: string) => {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    // Enlever le préfixe partId_timestamp_random
    const originalName = fileName.split('_').slice(3).join('_');
    return originalName || fileName;
  };

  const getFileType = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension === 'pdf' ? 'pdf' : 'image';
  };

  const downloadFile = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('part-attachments')
        .download(filePath);

      if (error) {
        throw error;
      }

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName(filePath);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {/* Zone d'upload */}
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div className="text-sm text-muted-foreground text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-0 h-auto font-normal text-primary hover:text-primary/80"
              >
                {uploading ? 'Upload en cours...' : 'Cliquez pour sélectionner'}
              </Button>
              <div>des photos ou PDF (max 5MB)</div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Fichiers joints ({files.length})</Label>
          <div className="space-y-2">
            {files.map((filePath, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                  {getFileType(filePath) === 'pdf' ? (
                    <File className="h-4 w-4 text-red-500" />
                  ) : (
                    <Image className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="text-sm truncate max-w-[200px]">
                    {getFileName(filePath)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getFileType(filePath).toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadFile(filePath)}
                    className="h-6 w-6 p-0"
                  >
                    <File className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(filePath)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}